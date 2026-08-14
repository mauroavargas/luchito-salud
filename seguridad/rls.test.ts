import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Lo único que separa el historial médico de ella del resto de internet es la
 * política de row level security de Postgres. La URL del proyecto y la clave
 * anon van dentro del bundle que cualquiera puede leer: son públicas por
 * diseño. Así que estas pruebas hacen lo que haría un curioso con esa clave —
 * intentar leer, cambiar y borrar los datos de otra persona — y exigen que
 * todo falle.
 *
 * Corren contra el proyecto real. No hay forma honesta de probar RLS con un
 * simulacro.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const BUCKET = 'adjuntos'
const TABLAS = ['topics', 'entries', 'medications', 'attachments', 'documents', 'reminders', 'reminder_logs', 'profiles'] as const

function cliente() {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function cuentaNueva() {
  const sb = cliente()
  const email = `rls-${Date.now()}-${Math.floor(Math.random() * 1e6)}@ejemplo.test`
  const { data, error } = await sb.auth.signUp({ email, password: 'prueba-rls-123' })
  if (error) throw error
  return { sb, id: data.user!.id, email }
}

let ana: { sb: SupabaseClient; id: string; email: string }
let curiosa: { sb: SupabaseClient; id: string; email: string }
let anonima: SupabaseClient
const deAna: Record<string, string> = {}
let rutaFoto = ''

beforeAll(async () => {
  ana = await cuentaNueva()
  curiosa = await cuentaNueva()
  anonima = cliente()

  const topic = await ana.sb
    .from('topics')
    .insert({ user_id: ana.id, name: 'Sangrado seno derecho' })
    .select()
    .single()
  if (topic.error) throw topic.error
  deAna.topic = topic.data.id

  const entry = await ana.sb
    .from('entries')
    .insert({ user_id: ana.id, topic_id: deAna.topic, kind: 'sangrado', note: 'dato íntimo', severity: 8 })
    .select()
    .single()
  if (entry.error) throw entry.error
  deAna.entry = entry.data.id

  const med = await ana.sb
    .from('medications')
    .insert({ user_id: ana.id, name: 'Ibuprofeno' })
    .select()
    .single()
  if (med.error) throw med.error
  deAna.medication = med.data.id

  const rem = await ana.sb
    .from('reminders')
    .insert({ user_id: ana.id, title: 'Reclamar en la EPS' })
    .select()
    .single()
  if (rem.error) throw rem.error
  deAna.reminder = rem.data.id

  const perfil = await ana.sb
    .from('profiles')
    .insert({ user_id: ana.id, full_name: 'Ana Vargas', allergies: 'penicilina' })
    .select()
    .single()
  if (perfil.error) throw perfil.error

  // Una foto real en el bucket privado.
  rutaFoto = `${ana.id}/${deAna.entry}/prueba.txt`
  const subida = await ana.sb.storage
    .from(BUCKET)
    .upload(rutaFoto, new Blob(['radiografía falsa'], { type: 'text/plain' }))
  if (subida.error) throw subida.error

  const doc = await ana.sb
    .from('documents')
    .insert({ user_id: ana.id, title: 'RX columna', kind: 'radiografia', path: rutaFoto })
    .select()
    .single()
  if (doc.error) throw doc.error
  deAna.document = doc.data.id
}, 60_000)

describe('sin iniciar sesión', () => {
  it.each(TABLAS)('no puede leer nada de %s', async (tabla) => {
    const { data, error } = await anonima.from(tabla).select('*')
    // O rechaza, o devuelve vacío. Lo que no puede es devolver filas.
    expect(error ?? data).toBeTruthy()
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede insertar nada', async () => {
    const { error } = await anonima.from('entries').insert({ user_id: ana.id, kind: 'dolor', note: 'colado' })
    expect(error).not.toBeNull()
  })

  it('no puede bajar un archivo del bucket privado', async () => {
    const { data, error } = await anonima.storage.from(BUCKET).download(rutaFoto)
    expect(error ?? data === null).toBeTruthy()
  })
})

describe('otra persona con cuenta propia', () => {
  it.each(TABLAS)('no ve ninguna fila de Ana en %s', async (tabla) => {
    const { data, error } = await curiosa.sb.from(tabla).select('*')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede leer un registro de Ana ni pidiéndolo por su id', async () => {
    const { data } = await curiosa.sb.from('entries').select('*').eq('id', deAna.entry)
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede leer el perfil de Ana ni sabiendo su user_id', async () => {
    const { data } = await curiosa.sb.from('profiles').select('*').eq('user_id', ana.id)
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede cambiar un registro de Ana', async () => {
    const { data } = await curiosa.sb
      .from('entries')
      .update({ note: 'alterado por alguien más' })
      .eq('id', deAna.entry)
      .select()
    expect(data ?? []).toHaveLength(0)

    // Y el original sigue intacto.
    const original = await ana.sb.from('entries').select('note').eq('id', deAna.entry).single()
    expect(original.data?.note).toBe('dato íntimo')
  })

  it('no puede borrar nada de Ana', async () => {
    for (const [tabla, id] of [
      ['entries', deAna.entry],
      ['topics', deAna.topic],
      ['medications', deAna.medication],
      ['reminders', deAna.reminder],
      ['documents', deAna.document],
    ] as const) {
      const { data } = await curiosa.sb.from(tabla).delete().eq('id', id).select()
      expect(data ?? [], `pudo borrar de ${tabla}`).toHaveLength(0)
    }
    const sigue = await ana.sb.from('entries').select('id').eq('id', deAna.entry)
    expect(sigue.data ?? []).toHaveLength(1)
  })

  it('no puede escribir una fila a nombre de Ana', async () => {
    const { error } = await curiosa.sb
      .from('entries')
      .insert({ user_id: ana.id, kind: 'dolor', note: 'metido a la fuerza' })
    expect(error, 'la política WITH CHECK dejó pasar un user_id ajeno').not.toBeNull()
  })

  it('no puede colgar un archivo dentro de la carpeta de Ana', async () => {
    const { error } = await curiosa.sb.storage
      .from(BUCKET)
      .upload(`${ana.id}/intruso.txt`, new Blob(['hola']))
    expect(error).not.toBeNull()
  })

  it('no puede bajar la foto de Ana ni conociendo la ruta exacta', async () => {
    const { data, error } = await curiosa.sb.storage.from(BUCKET).download(rutaFoto)
    expect(error ?? data === null).toBeTruthy()
  })

  it('no puede firmar una URL para la foto de Ana', async () => {
    const { data, error } = await curiosa.sb.storage.from(BUCKET).createSignedUrl(rutaFoto, 60)
    expect(error ?? data === null).toBeTruthy()
  })

  it('no puede listar la carpeta de Ana', async () => {
    const { data } = await curiosa.sb.storage.from(BUCKET).list(ana.id)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('Ana sí puede con lo suyo', () => {
  it('lee sus propios registros', async () => {
    const { data, error } = await ana.sb.from('entries').select('*')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  it('baja su propia foto', async () => {
    const { data, error } = await ana.sb.storage.from(BUCKET).download(rutaFoto)
    expect(error).toBeNull()
    expect(await data!.text()).toContain('radiografía falsa')
  })

  it('firma una URL temporal que sí funciona sin sesión', async () => {
    const { data, error } = await ana.sb.storage.from(BUCKET).createSignedUrl(rutaFoto, 60)
    expect(error).toBeNull()
    const respuesta = await fetch(data!.signedUrl)
    expect(respuesta.ok).toBe(true)
  })

  it('la URL pública del bucket no sirve: el bucket es privado', async () => {
    const publica = `${URL}/storage/v1/object/public/${BUCKET}/${rutaFoto}`
    const respuesta = await fetch(publica)
    expect(respuesta.ok).toBe(false)
  })
})

describe('integridad de los datos', () => {
  it('rechaza un tipo de registro inventado', async () => {
    const { error } = await ana.sb.from('entries').insert({ user_id: ana.id, kind: 'inventado' })
    expect(error).not.toBeNull()
  })

  it('rechaza una intensidad fuera de la escala', async () => {
    const { error } = await ana.sb.from('entries').insert({ user_id: ana.id, kind: 'dolor', severity: 99 })
    expect(error).not.toBeNull()
  })

  it('no deja dos marcas del mismo recordatorio el mismo día', async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const primera = await ana.sb
      .from('reminder_logs')
      .insert({ user_id: ana.id, reminder_id: deAna.reminder, done_on: hoy })
    expect(primera.error).toBeNull()
    const segunda = await ana.sb
      .from('reminder_logs')
      .insert({ user_id: ana.id, reminder_id: deAna.reminder, done_on: hoy })
    expect(segunda.error).not.toBeNull()
  })
})

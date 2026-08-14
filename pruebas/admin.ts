import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * El registro público está cerrado: solo Mauro y su hermana tienen cuenta. Las
 * pruebas ya no pueden usar `signUp`, así que crean y borran sus usuarios con
 * la clave de servicio.
 *
 * Esa clave se salta TODAS las políticas de seguridad. Por eso vive solo en
 * `.env.local` (fuera de git), sin el prefijo `VITE_` para que Vite jamás la
 * meta en el bundle, y solo se usa desde node al correr pruebas. Nunca desde
 * la app.
 */
const PREFIJOS = ['e2e-', 'rls-'] as const
const DOMINIO = 'ejemplo.test'
export const CLAVE_DE_PRUEBA = 'prueba-solo-local-123'

function cargarEnv() {
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return
  const ruta = resolve(process.cwd(), '.env.local')
  let texto = ''
  try {
    texto = readFileSync(ruta, 'utf8')
  } catch {
    throw new Error(`Falta ${ruta}. Sin él las pruebas no pueden crear cuentas.`)
  }
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const i = limpia.indexOf('=')
    if (i === -1) continue
    const clave = limpia.slice(0, i).trim()
    if (!process.env[clave]) process.env[clave] = limpia.slice(i + 1).trim()
  }
}

export function urlProyecto(): string {
  cargarEnv()
  return process.env.VITE_SUPABASE_URL!
}

export function claveAnon(): string {
  cargarEnv()
  return process.env.VITE_SUPABASE_ANON_KEY!
}

let _admin: SupabaseClient | null = null

function admin(): SupabaseClient {
  cargarEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Se saca del panel de Supabase (Project Settings → API).',
    )
  }
  _admin ??= createClient(urlProyecto(), key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _admin
}

export interface CuentaDePrueba {
  id: string
  email: string
  password: string
}

/** Crea un usuario ya confirmado, listo para entrar por el formulario. */
export async function crearUsuarioDePrueba(prefijo: 'e2e-' | 'rls-'): Promise<CuentaDePrueba> {
  const email = `${prefijo}${Date.now()}-${Math.floor(Math.random() * 1e6)}@${DOMINIO}`
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: CLAVE_DE_PRUEBA,
    email_confirm: true,
  })
  if (error) throw new Error(`No se pudo crear la cuenta de prueba: ${error.message}`)
  return { id: data.user!.id, email, password: CLAVE_DE_PRUEBA }
}

async function borrarArchivosDe(userId: string) {
  // Los archivos cuelgan de <user_id>/..., así que basta con vaciar esa carpeta.
  const sb = admin()
  const rutas: string[] = []
  const { data: carpetas } = await sb.storage.from('adjuntos').list(userId)
  for (const carpeta of carpetas ?? []) {
    if (carpeta.id === null) {
      const { data: dentro } = await sb.storage.from('adjuntos').list(`${userId}/${carpeta.name}`)
      for (const f of dentro ?? []) rutas.push(`${userId}/${carpeta.name}/${f.name}`)
    } else {
      rutas.push(`${userId}/${carpeta.name}`)
    }
  }
  if (rutas.length) await sb.storage.from('adjuntos').remove(rutas)
}

export async function borrarUsuarioDePrueba(userId: string) {
  await borrarArchivosDe(userId)
  // Las filas de las tablas se van solas: todas las llaves foráneas apuntan a
  // auth.users con ON DELETE CASCADE.
  await admin().auth.admin.deleteUser(userId)
}

/**
 * Borra TODAS las cuentas de prueba que hayan quedado sueltas. Solo toca las
 * que llevan los prefijos conocidos y el dominio ejemplo.test, que no existe:
 * ninguna persona real puede tener una así.
 */
export async function limpiarCuentasDePrueba(): Promise<number> {
  const sb = admin()
  let borradas = 0
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) throw error
    const usuarios = data.users ?? []
    if (!usuarios.length) break

    const dePrueba = usuarios.filter(
      (u) =>
        typeof u.email === 'string' &&
        u.email.endsWith(`@${DOMINIO}`) &&
        PREFIJOS.some((p) => u.email!.startsWith(p)),
    )
    for (const u of dePrueba) {
      await borrarUsuarioDePrueba(u.id)
      borradas++
    }
    // Si esta página no era solo de prueba, seguimos; si la lista se acabó, salimos.
    if (usuarios.length < 200) break
    pagina -= dePrueba.length === usuarios.length ? 1 : 0 // al borrar, las páginas se corren
  }
  return borradas
}

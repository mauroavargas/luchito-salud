import { supabase, BUCKET } from './supabase'
import type { Attachment, Entry, Medication, Profile, Topic } from '../types'

export interface Snapshot {
  topics: Topic[]
  entries: Entry[]
  medications: Medication[]
  attachments: Attachment[]
  profile: Profile | null
}

export const EMPTY: Snapshot = { topics: [], entries: [], medications: [], attachments: [], profile: null }

const CACHE_KEY = 'historial-cache-v1'
const OUTBOX_KEY = 'historial-outbox-v1'

export function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

export function writeCache(snap: Snapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap))
  } catch {
    /* cuota llena: no es crítico */
  }
}

export function clearLocal() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(OUTBOX_KEY)
}

export async function fetchAll(): Promise<Snapshot> {
  const [topics, entries, medications, attachments, profile] = await Promise.all([
    supabase.from('topics').select('*').order('created_at', { ascending: true }),
    supabase.from('entries').select('*').order('occurred_at', { ascending: false }),
    supabase.from('medications').select('*').order('created_at', { ascending: false }),
    supabase.from('attachments').select('*').order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').maybeSingle(),
  ])
  const err = topics.error || entries.error || medications.error || attachments.error
  if (err) throw err
  const snap: Snapshot = {
    topics: (topics.data ?? []) as Topic[],
    entries: (entries.data ?? []) as Entry[],
    medications: (medications.data ?? []) as Medication[],
    attachments: (attachments.data ?? []) as Attachment[],
    profile: (profile.data as Profile | null) ?? null,
  }
  writeCache(snap)
  return snap
}

/* ---------------- Temas ---------------- */

export async function createTopic(userId: string, patch: Partial<Topic> & { name: string }) {
  const { data, error } = await supabase
    .from('topics')
    .insert({ ...patch, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Topic
}

export async function updateTopic(id: string, patch: Partial<Topic>) {
  const { data, error } = await supabase.from('topics').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Topic
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from('topics').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Registros ---------------- */

export type NewEntry = {
  topic_id: string | null
  occurred_at: string
  kind: Entry['kind']
  title: string | null
  note: string | null
  severity: number | null
}

export async function createEntry(userId: string, payload: NewEntry) {
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Entry
}

export async function updateEntry(id: string, patch: Partial<Entry>) {
  const { data, error } = await supabase.from('entries').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Entry
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Medicamentos ---------------- */

export async function createMedication(userId: string, patch: Partial<Medication> & { name: string }) {
  const { data, error } = await supabase
    .from('medications')
    .insert({ ...patch, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Medication
}

export async function updateMedication(id: string, patch: Partial<Medication>) {
  const { data, error } = await supabase
    .from('medications')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Medication
}

export async function deleteMedication(id: string) {
  const { error } = await supabase.from('medications').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Ficha del paciente ---------------- */

export async function saveProfile(userId: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...patch, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

/* ---------------- Fotos ---------------- */

export async function uploadAttachment(userId: string, entryId: string, file: File) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (up.error) throw up.error
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      user_id: userId,
      entry_id: entryId,
      path,
      mime: file.type || null,
      size_bytes: file.size,
    })
    .select()
    .single()
  if (error) throw error
  return data as Attachment
}

export async function deleteAttachment(att: Attachment) {
  await supabase.storage.from(BUCKET).remove([att.path])
  const { error } = await supabase.from('attachments').delete().eq('id', att.id)
  if (error) throw error
}

const urlCache = new Map<string, { url: string; expires: number }>()

export async function signedUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path)
  if (hit && hit.expires > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + 3000_000 })
  return data.signedUrl
}

/* ---------------- Bandeja de salida (sin internet) ---------------- */

export function readOutbox(): NewEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    return raw ? (JSON.parse(raw) as NewEntry[]) : []
  } catch {
    return []
  }
}

export function pushOutbox(entry: NewEntry) {
  const list = readOutbox()
  list.push(entry)
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(list))
}

/** Reintenta los registros que se guardaron sin conexión. Devuelve cuántos subieron. */
export async function flushOutbox(userId: string): Promise<number> {
  const list = readOutbox()
  if (!list.length) return 0
  const pending: NewEntry[] = []
  let sent = 0
  for (const item of list) {
    try {
      await createEntry(userId, item)
      sent++
    } catch {
      pending.push(item)
    }
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(pending))
  return sent
}

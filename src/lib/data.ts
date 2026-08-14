import { supabase, BUCKET } from './supabase'
import type {
  Attachment,
  Document,
  Entry,
  Medication,
  Profile,
  Reminder,
  ReminderLog,
  Topic,
} from '../types'

export interface Snapshot {
  topics: Topic[]
  entries: Entry[]
  medications: Medication[]
  attachments: Attachment[]
  documents: Document[]
  reminders: Reminder[]
  reminderLogs: ReminderLog[]
  profile: Profile | null
}

export const EMPTY: Snapshot = {
  topics: [],
  entries: [],
  medications: [],
  attachments: [],
  documents: [],
  reminders: [],
  reminderLogs: [],
  profile: null,
}

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
  const [topics, entries, medications, attachments, documents, reminders, reminderLogs, profile] =
    await Promise.all([
      supabase.from('topics').select('*').order('created_at', { ascending: true }),
      supabase.from('entries').select('*').order('occurred_at', { ascending: false }),
      supabase.from('medications').select('*').order('created_at', { ascending: false }),
      supabase.from('attachments').select('*').order('created_at', { ascending: true }),
      supabase.from('documents').select('*').order('doc_date', { ascending: false, nullsFirst: false }),
      supabase.from('reminders').select('*').order('due_on', { ascending: true, nullsFirst: false }),
      supabase.from('reminder_logs').select('*').order('done_on', { ascending: false }).limit(400),
      supabase.from('profiles').select('*').maybeSingle(),
    ])
  const err =
    topics.error || entries.error || medications.error || attachments.error || documents.error || reminders.error
  if (err) throw err
  const snap: Snapshot = {
    topics: (topics.data ?? []) as Topic[],
    entries: (entries.data ?? []) as Entry[],
    medications: (medications.data ?? []) as Medication[],
    attachments: (attachments.data ?? []) as Attachment[],
    documents: (documents.data ?? []) as Document[],
    reminders: (reminders.data ?? []) as Reminder[],
    reminderLogs: (reminderLogs.data ?? []) as ReminderLog[],
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

/* ---------------- Archivo de documentos ---------------- */

export async function uploadDocument(
  userId: string,
  file: File,
  meta: { title: string; kind: Document['kind']; doc_date: string | null; topic_id: string | null; notes: string | null },
) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${userId}/docs/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (up.error) throw up.error
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...meta, user_id: userId, path, mime: file.type || null, size_bytes: file.size })
    .select()
    .single()
  if (error) throw error
  return data as Document
}

export async function updateDocument(id: string, patch: Partial<Document>) {
  const { data, error } = await supabase.from('documents').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Document
}

export async function deleteDocument(doc: Document) {
  await supabase.storage.from(BUCKET).remove([doc.path])
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

/* ---------------- Recordatorios ---------------- */

export async function createReminder(userId: string, patch: Partial<Reminder> & { title: string }) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...patch, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Reminder
}

export async function updateReminder(id: string, patch: Partial<Reminder>) {
  const { data, error } = await supabase.from('reminders').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Reminder
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}

/** Marca el recordatorio como hecho hoy (o en la fecha dada). */
export async function logReminder(userId: string, reminderId: string, onDay: string) {
  const { data, error } = await supabase
    .from('reminder_logs')
    .upsert({ user_id: userId, reminder_id: reminderId, done_on: onDay }, { onConflict: 'reminder_id,done_on' })
    .select()
    .single()
  if (error) throw error
  await supabase.from('reminders').update({ last_done_on: onDay }).eq('id', reminderId)
  return data as ReminderLog
}

export async function unlogReminder(reminderId: string, onDay: string) {
  const { error } = await supabase
    .from('reminder_logs')
    .delete()
    .eq('reminder_id', reminderId)
    .eq('done_on', onDay)
  if (error) throw error
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

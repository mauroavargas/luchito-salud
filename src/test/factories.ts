import type { Snapshot } from '../lib/data'
import type {
  Document,
  Entry,
  Medication,
  Profile,
  Reminder,
  ReminderLog,
  Topic,
} from '../types'

const USER = 'user-1'
let seq = 0
const id = (p: string) => `${p}-${++seq}`

export function resetIds() {
  seq = 0
}

export function topic(patch: Partial<Topic> = {}): Topic {
  return {
    id: id('topic'),
    user_id: USER,
    name: 'Tema',
    description: null,
    body_area: null,
    status: 'activo',
    started_on: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}

export function entry(patch: Partial<Entry> = {}): Entry {
  return {
    id: id('entry'),
    user_id: USER,
    topic_id: null,
    occurred_at: '2026-08-14T12:00:00.000Z',
    kind: 'sintoma',
    title: null,
    note: null,
    severity: null,
    resolved: false,
    created_at: '2026-08-14T12:00:00.000Z',
    ...patch,
  }
}

export function medication(patch: Partial<Medication> = {}): Medication {
  return {
    id: id('med'),
    user_id: USER,
    topic_id: null,
    name: 'Medicamento',
    dose: null,
    frequency: null,
    started_on: null,
    ended_on: null,
    effect: 'sin_saber',
    side_effects: null,
    prescribed_by: null,
    notes: null,
    created_at: '2026-08-01T00:00:00.000Z',
    ...patch,
  }
}

export function document(patch: Partial<Document> = {}): Document {
  return {
    id: id('doc'),
    user_id: USER,
    topic_id: null,
    title: 'Documento',
    kind: 'otro',
    doc_date: null,
    path: `${USER}/docs/x.jpg`,
    mime: 'image/jpeg',
    size_bytes: 1000,
    notes: null,
    created_at: '2026-08-14T12:00:00.000Z',
    ...patch,
  }
}

export function reminder(patch: Partial<Reminder> = {}): Reminder {
  return {
    id: id('rem'),
    user_id: USER,
    topic_id: null,
    medication_id: null,
    title: 'Recordatorio',
    kind: 'otro',
    due_on: null,
    due_time: null,
    repeat: 'none',
    active: true,
    last_done_on: null,
    notes: null,
    created_at: '2026-08-01T00:00:00.000Z',
    ...patch,
  }
}

export function log(reminderId: string, doneOn: string): ReminderLog {
  return {
    id: id('log'),
    user_id: USER,
    reminder_id: reminderId,
    done_on: doneOn,
    created_at: `${doneOn}T12:00:00.000Z`,
  }
}

export function profile(patch: Partial<Profile> = {}): Profile {
  return {
    user_id: USER,
    full_name: null,
    birth_date: null,
    blood_type: null,
    allergies: null,
    conditions: null,
    insurance: null,
    emergency_contact: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...patch,
  }
}

export function snapshot(patch: Partial<Snapshot> = {}): Snapshot {
  return {
    topics: [],
    entries: [],
    medications: [],
    attachments: [],
    documents: [],
    reminders: [],
    reminderLogs: [],
    profile: null,
    ...patch,
  }
}

/** Fecha ISO a N días del "hoy" de los tests. */
export function diasAtras(n: number, hoy = '2026-08-14'): string {
  const d = new Date(`${hoy}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

export function fechaAtras(n: number, hoy = '2026-08-14'): string {
  return diasAtras(n, hoy).slice(0, 10)
}

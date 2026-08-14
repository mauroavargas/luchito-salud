export type TopicStatus = 'activo' | 'seguimiento' | 'resuelto'

export type EntryKind =
  | 'sintoma'
  | 'dolor'
  | 'sangrado'
  | 'medicamento'
  | 'animo'
  | 'cita'
  | 'examen'
  | 'pregunta'
  | 'otro'

export type MedEffect = 'ayuda' | 'ayuda_poco' | 'no_ayuda' | 'empeora' | 'sin_saber'

export interface Topic {
  id: string
  user_id: string
  name: string
  description: string | null
  body_area: string | null
  status: TopicStatus
  started_on: string | null
  created_at: string
}

export interface Entry {
  id: string
  user_id: string
  topic_id: string | null
  occurred_at: string
  kind: EntryKind
  title: string | null
  note: string | null
  severity: number | null
  resolved: boolean
  created_at: string
}

export interface Medication {
  id: string
  user_id: string
  topic_id: string | null
  name: string
  dose: string | null
  frequency: string | null
  started_on: string | null
  ended_on: string | null
  effect: MedEffect
  side_effects: string | null
  prescribed_by: string | null
  notes: string | null
  created_at: string
}

export interface Attachment {
  id: string
  user_id: string
  entry_id: string
  path: string
  mime: string | null
  size_bytes: number | null
  caption: string | null
  created_at: string
}

export const KIND_LABEL: Record<EntryKind, string> = {
  sintoma: 'Síntoma',
  dolor: 'Dolor',
  sangrado: 'Sangrado',
  medicamento: 'Medicamento',
  animo: 'Ánimo',
  cita: 'Cita médica',
  examen: 'Examen',
  pregunta: 'Pregunta para el médico',
  otro: 'Otro',
}

export const KIND_EMOJI: Record<EntryKind, string> = {
  sintoma: '🩺',
  dolor: '⚡',
  sangrado: '🩸',
  medicamento: '💊',
  animo: '🫂',
  cita: '📅',
  examen: '🧪',
  pregunta: '❓',
  otro: '📝',
}

export const EFFECT_LABEL: Record<MedEffect, string> = {
  ayuda: 'Me ayuda',
  ayuda_poco: 'Ayuda poco',
  no_ayuda: 'No me ayuda',
  empeora: 'Me cae mal',
  sin_saber: 'Aún no sé',
}

export const STATUS_LABEL: Record<TopicStatus, string> = {
  activo: 'Activo',
  seguimiento: 'En seguimiento',
  resuelto: 'Resuelto',
}

export interface Profile {
  user_id: string
  full_name: string | null
  birth_date: string | null
  blood_type: string | null
  allergies: string | null
  conditions: string | null
  insurance: string | null
  emergency_contact: string | null
  updated_at: string
}

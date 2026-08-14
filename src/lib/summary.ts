import type { Snapshot } from './data'
import type { Document, Entry, Medication, Reminder, Topic } from '../types'
import { DOC_LABEL, EFFECT_LABEL, KIND_LABEL, REM_LABEL } from '../types'
import { fmtDate, severityLabel, since } from './format'
import { adherence, pendingReminders } from './nudges'

export interface TopicSummary {
  topic: Topic
  entries: Entry[]
  meds: Medication[]
  firstAt: string | null
  lastAt: string | null
  count: number
  maxSeverity: number | null
  avgSeverity: number | null
  photos: number
  docs: Document[]
}

export interface Summary {
  topics: TopicSummary[]
  general: Entry[]
  preguntas: Entry[]
  medsActivos: Medication[]
  medsFallidos: Medication[]
  documents: Document[]
  adherencia: { reminder: Reminder; done: number; days: number }[]
  tramites: { reminder: Reminder; overdue: number }[]
  totalEntries: number
}

export function buildSummary(data: Snapshot): Summary {
  const noQuestions = (e: Entry) => e.kind !== 'pregunta'

  const topics: TopicSummary[] = data.topics
    .map((topic) => {
      const entries = data.entries
        .filter((e) => e.topic_id === topic.id && noQuestions(e))
        .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
      const sev = entries.map((e) => e.severity).filter((s): s is number => s !== null)
      const ids = new Set(entries.map((e) => e.id))
      return {
        topic,
        entries,
        meds: data.medications.filter((m) => m.topic_id === topic.id),
        firstAt: entries.length ? entries[entries.length - 1].occurred_at : null,
        lastAt: entries.length ? entries[0].occurred_at : null,
        count: entries.length,
        maxSeverity: sev.length ? Math.max(...sev) : null,
        avgSeverity: sev.length ? Math.round((sev.reduce((a, b) => a + b, 0) / sev.length) * 10) / 10 : null,
        photos: data.attachments.filter((a) => ids.has(a.entry_id)).length,
        docs: data.documents.filter((d) => d.topic_id === topic.id),
      }
    })
    // Primero lo activo, y dentro de eso lo que más ha pasado.
    .sort((a, b) => {
      const rank = (s: Topic['status']) => (s === 'activo' ? 0 : s === 'seguimiento' ? 1 : 2)
      const r = rank(a.topic.status) - rank(b.topic.status)
      return r !== 0 ? r : b.count - a.count
    })

  return {
    topics,
    general: data.entries.filter((e) => !e.topic_id && noQuestions(e)),
    preguntas: data.entries.filter((e) => e.kind === 'pregunta' && !e.resolved),
    medsActivos: data.medications.filter((m) => !m.ended_on),
    medsFallidos: data.medications.filter((m) => m.effect === 'no_ayuda' || m.effect === 'empeora'),
    documents: data.documents,
    adherencia: data.reminders
      .filter((r) => r.active && r.kind === 'tomar' && r.repeat === 'daily')
      .map((r) => ({ reminder: r, ...adherence(data, r.id, 30) })),
    tramites: pendingReminders(data)
      .filter((p) => !p.doneToday && ['reclamar', 'examen', 'documento', 'cita'].includes(p.reminder.kind))
      .map((p) => ({ reminder: p.reminder, overdue: p.overdue })),
    totalEntries: data.entries.filter(noQuestions).length,
  }
}

/** Versión en texto plano, para copiar o mandar por WhatsApp al médico o a la familia. */
export function summaryText(data: Snapshot, s: Summary): string {
  const L: string[] = []
  const p = data.profile

  L.push('RESUMEN DE SALUD')
  if (p?.full_name) L.push(`Paciente: ${p.full_name}`)
  if (p?.birth_date) L.push(`Fecha de nacimiento: ${fmtDate(p.birth_date)}`)
  if (p?.insurance) L.push(`EPS / seguro: ${p.insurance}`)
  if (p?.blood_type) L.push(`Grupo sanguíneo: ${p.blood_type}`)
  if (p?.allergies) L.push(`Alergias: ${p.allergies}`)
  if (p?.conditions) L.push(`Antecedentes: ${p.conditions}`)
  L.push(`Generado el ${fmtDate(new Date().toISOString())}`)
  L.push('')

  for (const t of s.topics) {
    if (t.topic.status === 'resuelto' && t.count === 0) continue
    L.push(`— ${t.topic.name.toUpperCase()} —`)
    const desde = t.topic.started_on ?? t.firstAt
    if (desde) L.push(`Desde: ${fmtDate(desde)} (${since(desde)})`)
    if (t.topic.description) L.push(t.topic.description)
    L.push(
      `${t.count} episodio(s) registrado(s)` +
        (t.maxSeverity !== null ? `, intensidad máxima ${t.maxSeverity}/10, promedio ${t.avgSeverity}/10` : ''),
    )
    if (t.photos) L.push(`${t.photos} foto(s) adjunta(s) en la app`)
    for (const e of t.entries.slice(0, 6)) {
      const sev = e.severity !== null ? ` [${e.severity}/10]` : ''
      L.push(`  · ${fmtDate(e.occurred_at)}${sev}: ${e.title || KIND_LABEL[e.kind]}${e.note ? ` — ${e.note}` : ''}`)
    }
    if (t.entries.length > 6) L.push(`  · (+${t.entries.length - 6} registros más en la app)`)
    if (t.docs.length) {
      L.push('  Documentos guardados:')
      for (const d of t.docs) L.push(`  · ${DOC_LABEL[d.kind]}: ${d.title}${d.doc_date ? ` (${fmtDate(d.doc_date)})` : ''}`)
    }
    if (t.meds.length) {
      L.push('  Medicamentos para esto:')
      for (const m of t.meds) L.push(`  · ${m.name}${m.dose ? ` ${m.dose}` : ''} — ${EFFECT_LABEL[m.effect]}`)
    }
    L.push('')
  }

  if (s.medsActivos.length) {
    L.push('— MEDICAMENTOS QUE TOMA AHORA —')
    for (const m of s.medsActivos) {
      L.push(
        `· ${m.name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? `, ${m.frequency}` : ''} — ${EFFECT_LABEL[m.effect]}` +
          (m.side_effects ? ` (efectos: ${m.side_effects})` : ''),
      )
    }
    L.push('')
  }

  if (s.medsFallidos.length) {
    L.push('— YA PROBÓ Y NO LE SIRVIÓ —')
    for (const m of s.medsFallidos) L.push(`· ${m.name} — ${EFFECT_LABEL[m.effect]}`)
    L.push('')
  }

  if (s.adherencia.length) {
    L.push('— CUMPLIMIENTO DEL TRATAMIENTO (últimos 30 días) —')
    for (const a of s.adherencia) L.push(`· ${a.reminder.title}: ${a.done} de ${a.days} días`)
    L.push('')
  }

  if (s.tramites.length) {
    L.push('— TRÁMITES PENDIENTES —')
    for (const t of s.tramites) {
      L.push(`· ${REM_LABEL[t.reminder.kind]}: ${t.reminder.title}` + (t.overdue > 0 ? ` (atrasado ${t.overdue} días)` : ''))
    }
    L.push('')
  }

  const sueltos = s.documents.filter((d) => !d.topic_id)
  if (sueltos.length) {
    L.push('— OTROS DOCUMENTOS —')
    for (const d of sueltos) L.push(`· ${DOC_LABEL[d.kind]}: ${d.title}${d.doc_date ? ` (${fmtDate(d.doc_date)})` : ''}`)
    L.push('')
  }

  if (s.general.length) {
    L.push('— OTROS REGISTROS —')
    for (const e of s.general.slice(0, 10)) {
      const sev = e.severity !== null ? ` [${e.severity}/10 ${severityLabel(e.severity)}]` : ''
      L.push(`· ${fmtDate(e.occurred_at)}${sev}: ${e.title || KIND_LABEL[e.kind]}${e.note ? ` — ${e.note}` : ''}`)
    }
    L.push('')
  }

  if (s.preguntas.length) {
    L.push('— PREGUNTAS PARA EL MÉDICO —')
    for (const q of s.preguntas) L.push(`· ${q.title || q.note}`)
    L.push('')
  }

  return L.join('\n')
}

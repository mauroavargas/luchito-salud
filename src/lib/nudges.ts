import type { Snapshot } from './data'
import type { Reminder } from '../types'

export function todayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysBetween(a: string, b: string): number {
  return Math.round((+new Date(b) - +new Date(a)) / 86400000)
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - +new Date(iso)) / 86400000)
}

/* ---------------- Pendientes de hoy ---------------- */

export interface Pending {
  reminder: Reminder
  /** Días de atraso. 0 = es para hoy. */
  overdue: number
  doneToday: boolean
}

export function pendingReminders(data: Snapshot, today = todayKey()): Pending[] {
  const logs = data.reminderLogs
  const lastLog = (id: string) => logs.filter((l) => l.reminder_id === id).map((l) => l.done_on).sort().pop() ?? null

  const out: Pending[] = []
  for (const r of data.reminders) {
    if (!r.active) continue
    const last = lastLog(r.id)
    const doneToday = last === today

    if (r.repeat === 'none') {
      // Una sola vez: sale de la lista cuando ya se hizo.
      if (last) continue
      const overdue = r.due_on ? daysBetween(r.due_on, today) : 0
      if (r.due_on && overdue < 0) continue // todavía no toca
      out.push({ reminder: r, overdue: Math.max(0, overdue), doneToday: false })
      continue
    }

    // Un recordatorio repetido que empieza más adelante todavía no aplica.
    if (r.due_on && daysBetween(r.due_on, today) < 0) continue

    const periodo = r.repeat === 'daily' ? 1 : r.repeat === 'weekly' ? 7 : 30
    const desde = last ? daysBetween(last, today) : periodo
    if (desde < periodo) {
      if (doneToday) out.push({ reminder: r, overdue: 0, doneToday: true })
      continue
    }
    out.push({ reminder: r, overdue: Math.max(0, desde - periodo), doneToday: false })
  }

  return out.sort((a, b) => b.overdue - a.overdue)
}

/** Cuántas veces cumplió un recordatorio repetido en los últimos N días. */
export function adherence(
  data: Snapshot,
  reminderId: string,
  days = 30,
  today = todayKey(),
): { done: number; days: number } {
  // Comparación entre fechas sin hora: la hora del día no debe decidir si un
  // día entra o no en la ventana.
  const done = data.reminderLogs.filter((l) => {
    if (l.reminder_id !== reminderId) return false
    const atras = daysBetween(l.done_on, today)
    return atras >= 0 && atras < days
  }).length
  return { done, days }
}

/* ---------------- Sugerencias automáticas ---------------- */

export type NudgeAction =
  | { type: 'documento' }
  | { type: 'medicamento'; id: string }
  | { type: 'tema'; id: string }
  | { type: 'perfil' }
  | { type: 'registro' }
  | { type: 'recordatorio' }

export interface Nudge {
  id: string
  icon: string
  text: string
  cta: string
  action: NudgeAction
  weight: number
}

/**
 * Mira los datos y arma la lista de "lo que se te está quedando por fuera".
 * Todo se calcula en el celular; no hace falta servidor ni notificaciones.
 */
export function buildNudges(data: Snapshot): Nudge[] {
  const n: Nudge[] = []
  const docs = data.documents

  // 1. Exámenes hechos sin resultado subido.
  for (const e of data.entries.filter((x) => x.kind === 'examen')) {
    const edad = daysAgo(e.occurred_at)
    if (edad < 2 || edad > 120) continue
    const hayResultado = docs.some(
      (d) => ['resultado', 'examen', 'radiografia'].includes(d.kind) && +new Date(d.created_at) > +new Date(e.occurred_at),
    )
    if (hayResultado) continue
    n.push({
      id: `res-${e.id}`,
      icon: '📊',
      text: `Te hiciste un examen hace ${edad} días (${e.title || 'sin título'}) y no hay resultado guardado. ¿Ya te lo entregaron?`,
      cta: 'Subir el resultado',
      action: { type: 'documento' },
      weight: 90,
    })
  }

  // 2. Citas pasadas sin órdenes ni fórmulas guardadas.
  for (const e of data.entries.filter((x) => x.kind === 'cita')) {
    const edad = daysAgo(e.occurred_at)
    if (edad < 1 || edad > 60) continue
    const hayPapeles = docs.some(
      (d) => ['orden', 'formula', 'incapacidad'].includes(d.kind) && +new Date(d.created_at) > +new Date(e.occurred_at),
    )
    if (hayPapeles) continue
    n.push({
      id: `cita-${e.id}`,
      icon: '📄',
      text: `De la cita del ${new Date(e.occurred_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} no hay órdenes ni fórmulas guardadas. Tómales foto antes de que se pierdan.`,
      cta: 'Guardar el papel',
      action: { type: 'documento' },
      weight: 85,
    })
  }

  // 3. Medicamentos activos sin saber si sirven.
  for (const m of data.medications) {
    if (m.ended_on || m.effect !== 'sin_saber') continue
    const edad = daysAgo(m.created_at)
    if (edad < 4) continue
    n.push({
      id: `med-${m.id}`,
      icon: '💊',
      text: `Llevas ${edad} días con ${m.name} y no has anotado si te sirve. Eso es justo lo que el médico va a preguntar.`,
      cta: '¿Me está ayudando?',
      action: { type: 'medicamento', id: m.id },
      weight: 80,
    })
  }

  // 4. Temas activos sin documentos de respaldo.
  for (const t of data.topics) {
    if (t.status === 'resuelto') continue
    if (docs.some((d) => d.topic_id === t.id)) continue
    n.push({
      id: `doc-${t.id}`,
      icon: '🦴',
      text: `De “${t.name}” no hay ninguna radiografía, examen ni orden guardada. Si tienes papeles viejos, súbelos.`,
      cta: 'Subir al archivo',
      action: { type: 'documento' },
      weight: 60,
    })
  }

  // 5. Temas activos sin novedades hace rato.
  for (const t of data.topics) {
    if (t.status !== 'activo') continue
    const propias = data.entries.filter((e) => e.topic_id === t.id)
    if (!propias.length) continue
    const edad = daysAgo(propias[0].occurred_at)
    if (edad < 7) continue
    n.push({
      id: `tema-${t.id}`,
      icon: '📖',
      text: `Hace ${edad} días no anotas nada de “${t.name}”. ¿Sigue igual, mejor o peor?`,
      cta: 'Anotar cómo va',
      action: { type: 'tema', id: t.id },
      weight: 55,
    })
  }

  // 6. Sin alergias anotadas: es lo primero que preguntan en urgencias.
  if (!data.profile?.allergies) {
    n.push({
      id: 'perfil-alergias',
      icon: '⚠️',
      text: 'No has anotado si tienes alergias a algún medicamento. En urgencias es lo primero que preguntan.',
      cta: 'Completar mis datos',
      action: { type: 'perfil' },
      weight: 70,
    })
  }

  // 7. Silencio general.
  if (data.entries.length > 0) {
    const edad = daysAgo(data.entries[0].occurred_at)
    if (edad >= 4) {
      n.push({
        id: 'silencio',
        icon: '🕒',
        text: `Hace ${edad} días no anotas nada. Si esperas a la cita para acordarte, se te van a olvidar cosas.`,
        cta: 'Anotar algo de hoy',
        action: { type: 'registro' },
        weight: 50,
      })
    }
  }

  // 8. Sin recordatorios configurados.
  if (data.reminders.filter((r) => r.active).length === 0 && data.medications.some((m) => !m.ended_on)) {
    n.push({
      id: 'sin-recordatorios',
      icon: '🔔',
      text: 'No tienes recordatorios. Puedes poner uno para no olvidar tomar o reclamar los medicamentos.',
      cta: 'Crear recordatorio',
      action: { type: 'recordatorio' },
      weight: 45,
    })
  }

  return n.sort((a, b) => b.weight - a.weight)
}

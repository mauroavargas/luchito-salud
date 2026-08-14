import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adherence, buildNudges, pendingReminders, todayKey } from './nudges'
import {
  diasAtras,
  document,
  entry,
  fechaAtras,
  log,
  medication,
  profile,
  reminder,
  resetIds,
  snapshot,
  topic,
} from '../test/factories'

const HOY = '2026-08-14'

beforeEach(() => {
  resetIds()
  vi.useFakeTimers()
  // 10:00 de la mañana en Bogotá del 14 de agosto de 2026.
  vi.setSystemTime(new Date('2026-08-14T15:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('todayKey', () => {
  it('usa el día local, no el UTC', () => {
    vi.setSystemTime(new Date('2026-08-15T02:00:00.000Z')) // 21:00 del 14 en Bogotá
    expect(todayKey()).toBe('2026-08-14')
  })
})

describe('pendingReminders — de una sola vez', () => {
  it('sale como pendiente el día que toca', () => {
    const r = reminder({ repeat: 'none', due_on: HOY })
    const p = pendingReminders(snapshot({ reminders: [r] }), HOY)
    expect(p).toHaveLength(1)
    expect(p[0].overdue).toBe(0)
    expect(p[0].doneToday).toBe(false)
  })

  it('cuenta los días de atraso', () => {
    const r = reminder({ repeat: 'none', due_on: fechaAtras(3) })
    const p = pendingReminders(snapshot({ reminders: [r] }), HOY)
    expect(p[0].overdue).toBe(3)
  })

  it('no aparece si todavía no le toca', () => {
    const r = reminder({ repeat: 'none', due_on: '2026-08-20' })
    expect(pendingReminders(snapshot({ reminders: [r] }), HOY)).toHaveLength(0)
  })

  it('desaparece cuando ya se hizo', () => {
    const r = reminder({ repeat: 'none', due_on: HOY })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, HOY)] })
    expect(pendingReminders(data, HOY)).toHaveLength(0)
  })

  it('sin fecha sigue pendiente hasta que se haga', () => {
    const r = reminder({ repeat: 'none', due_on: null })
    expect(pendingReminders(snapshot({ reminders: [r] }), HOY)).toHaveLength(1)
  })
})

describe('pendingReminders — repetidos', () => {
  it('el diario aparece si nunca se ha hecho', () => {
    const r = reminder({ repeat: 'daily' })
    const p = pendingReminders(snapshot({ reminders: [r] }), HOY)
    expect(p[0].overdue).toBe(0)
    expect(p[0].doneToday).toBe(false)
  })

  it('el diario hecho hoy queda marcado pero visible', () => {
    const r = reminder({ repeat: 'daily' })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, HOY)] })
    const p = pendingReminders(data, HOY)
    expect(p).toHaveLength(1)
    expect(p[0].doneToday).toBe(true)
  })

  it('el diario hecho ayer vuelve a estar pendiente hoy, sin atraso', () => {
    const r = reminder({ repeat: 'daily' })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(1))] })
    const p = pendingReminders(data, HOY)
    expect(p[0].doneToday).toBe(false)
    expect(p[0].overdue).toBe(0)
  })

  it('el diario abandonado acumula atraso', () => {
    const r = reminder({ repeat: 'daily' })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(4))] })
    expect(pendingReminders(data, HOY)[0].overdue).toBe(3)
  })

  it('el semanal hecho hace 3 días todavía no toca', () => {
    const r = reminder({ repeat: 'weekly' })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(3))] })
    expect(pendingReminders(data, HOY)).toHaveLength(0)
  })

  it('el semanal hecho hace 10 días va con 3 de atraso', () => {
    const r = reminder({ repeat: 'weekly' })
    const data = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(10))] })
    expect(pendingReminders(data, HOY)[0].overdue).toBe(3)
  })

  it('el mensual respeta su periodo', () => {
    const r = reminder({ repeat: 'monthly' })
    const reciente = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(20))] })
    expect(pendingReminders(reciente, HOY)).toHaveLength(0)
    const viejo = snapshot({ reminders: [r], reminderLogs: [log(r.id, fechaAtras(45))] })
    expect(pendingReminders(viejo, HOY)[0].overdue).toBe(15)
  })

  it('un repetido que empieza más adelante no aparece todavía', () => {
    const r = reminder({ repeat: 'daily', due_on: '2026-09-01' })
    expect(pendingReminders(snapshot({ reminders: [r] }), HOY)).toHaveLength(0)
  })
})

describe('pendingReminders — reglas generales', () => {
  it('ignora los desactivados', () => {
    const r = reminder({ repeat: 'daily', active: false })
    expect(pendingReminders(snapshot({ reminders: [r] }), HOY)).toHaveLength(0)
  })

  it('pone primero lo más atrasado', () => {
    const poco = reminder({ repeat: 'none', due_on: fechaAtras(1), title: 'poco' })
    const mucho = reminder({ repeat: 'none', due_on: fechaAtras(9), title: 'mucho' })
    const p = pendingReminders(snapshot({ reminders: [poco, mucho] }), HOY)
    expect(p.map((x) => x.reminder.title)).toEqual(['mucho', 'poco'])
  })
})

describe('adherence', () => {
  it('cuenta solo los días dentro de la ventana', () => {
    const r = reminder({ repeat: 'daily' })
    const data = snapshot({
      reminders: [r],
      reminderLogs: [log(r.id, HOY), log(r.id, fechaAtras(10)), log(r.id, fechaAtras(29)), log(r.id, fechaAtras(45))],
    })
    expect(adherence(data, r.id, 30, HOY)).toEqual({ done: 3, days: 30 })
  })

  it('no mezcla el cumplimiento de dos recordatorios', () => {
    const a = reminder({ repeat: 'daily' })
    const b = reminder({ repeat: 'daily' })
    const data = snapshot({ reminders: [a, b], reminderLogs: [log(a.id, HOY), log(b.id, HOY)] })
    expect(adherence(data, a.id, 30, HOY).done).toBe(1)
  })
})

describe('buildNudges', () => {
  const conAlergias = profile({ allergies: 'ninguna' })

  it('avisa de un examen sin resultado guardado', () => {
    const data = snapshot({
      profile: conAlergias,
      entries: [entry({ kind: 'examen', title: 'ecografía', occurred_at: diasAtras(5) })],
    })
    const n = buildNudges(data)
    expect(n.some((x) => x.id.startsWith('res-'))).toBe(true)
    expect(n.find((x) => x.id.startsWith('res-'))!.text).toContain('5 días')
  })

  it('se calla si el resultado ya está subido', () => {
    const data = snapshot({
      profile: conAlergias,
      entries: [entry({ kind: 'examen', occurred_at: diasAtras(5) })],
      documents: [document({ kind: 'resultado', created_at: diasAtras(1) })],
    })
    expect(buildNudges(data).some((x) => x.id.startsWith('res-'))).toBe(false)
  })

  it('no molesta con un examen de ayer', () => {
    const data = snapshot({
      profile: conAlergias,
      entries: [entry({ kind: 'examen', occurred_at: diasAtras(1) })],
    })
    expect(buildNudges(data).some((x) => x.id.startsWith('res-'))).toBe(false)
  })

  it('avisa de una cita sin órdenes ni fórmulas', () => {
    const data = snapshot({
      profile: conAlergias,
      entries: [entry({ kind: 'cita', occurred_at: diasAtras(3) })],
    })
    expect(buildNudges(data).some((x) => x.id.startsWith('cita-'))).toBe(true)
  })

  it('pregunta por un medicamento que lleva días sin evaluar', () => {
    const data = snapshot({
      profile: conAlergias,
      medications: [medication({ name: 'Ibuprofeno', effect: 'sin_saber', created_at: diasAtras(6) })],
    })
    const n = buildNudges(data).find((x) => x.id.startsWith('med-'))
    expect(n).toBeDefined()
    expect(n!.text).toContain('Ibuprofeno')
  })

  it('no pregunta si ella ya dijo si le sirve', () => {
    const data = snapshot({
      profile: conAlergias,
      medications: [medication({ effect: 'no_ayuda', created_at: diasAtras(6) })],
    })
    expect(buildNudges(data).some((x) => x.id.startsWith('med-'))).toBe(false)
  })

  it('no pregunta por medicamentos que ya dejó', () => {
    const data = snapshot({
      profile: conAlergias,
      medications: [medication({ effect: 'sin_saber', ended_on: fechaAtras(2), created_at: diasAtras(30) })],
    })
    expect(buildNudges(data).some((x) => x.id.startsWith('med-'))).toBe(false)
  })

  it('pide papeles de un tema que no tiene ninguno', () => {
    const t = topic({ name: 'Escoliosis' })
    const data = snapshot({ profile: conAlergias, topics: [t] })
    expect(buildNudges(data).some((x) => x.id === `doc-${t.id}`)).toBe(true)
  })

  it('deja de pedirlos cuando el tema ya tiene un documento', () => {
    const t = topic({ name: 'Escoliosis' })
    const data = snapshot({ profile: conAlergias, topics: [t], documents: [document({ topic_id: t.id })] })
    expect(buildNudges(data).some((x) => x.id === `doc-${t.id}`)).toBe(false)
  })

  it('pregunta cómo va un tema activo del que hace rato no anota', () => {
    const t = topic({ name: 'Seno derecho' })
    const data = snapshot({
      profile: conAlergias,
      topics: [t],
      documents: [document({ topic_id: t.id })],
      entries: [entry({ topic_id: t.id, occurred_at: diasAtras(9) })],
    })
    const n = buildNudges(data).find((x) => x.id === `tema-${t.id}`)
    expect(n?.text).toContain('Seno derecho')
  })

  it('no insiste con un tema que se anotó esta semana', () => {
    const t = topic({ name: 'Seno derecho' })
    const data = snapshot({
      profile: conAlergias,
      topics: [t],
      documents: [document({ topic_id: t.id })],
      entries: [entry({ topic_id: t.id, occurred_at: diasAtras(2) })],
    })
    expect(buildNudges(data).some((x) => x.id === `tema-${t.id}`)).toBe(false)
  })

  it('reclama las alergias mientras estén sin anotar', () => {
    expect(buildNudges(snapshot()).some((x) => x.id === 'perfil-alergias')).toBe(true)
    expect(buildNudges(snapshot({ profile: conAlergias })).some((x) => x.id === 'perfil-alergias')).toBe(false)
  })

  it('avisa cuando lleva días sin anotar nada', () => {
    const data = snapshot({ profile: conAlergias, entries: [entry({ occurred_at: diasAtras(6) })] })
    expect(buildNudges(data).some((x) => x.id === 'silencio')).toBe(true)
  })

  it('no dice nada del silencio si anotó anteayer', () => {
    const data = snapshot({ profile: conAlergias, entries: [entry({ occurred_at: diasAtras(2) })] })
    expect(buildNudges(data).some((x) => x.id === 'silencio')).toBe(false)
  })

  it('sugiere crear un recordatorio solo si toma algo y no tiene ninguno', () => {
    const conMed = snapshot({ profile: conAlergias, medications: [medication({ effect: 'ayuda' })] })
    expect(buildNudges(conMed).some((x) => x.id === 'sin-recordatorios')).toBe(true)

    const yaTiene = snapshot({
      profile: conAlergias,
      medications: [medication({ effect: 'ayuda' })],
      reminders: [reminder({ active: true })],
    })
    expect(buildNudges(yaTiene).some((x) => x.id === 'sin-recordatorios')).toBe(false)
  })

  it('con los datos completos y al día no inventa avisos', () => {
    const t = topic({ name: 'Escoliosis' })
    const data = snapshot({
      profile: conAlergias,
      topics: [t],
      documents: [document({ topic_id: t.id })],
      entries: [entry({ topic_id: t.id, occurred_at: diasAtras(1) })],
      medications: [medication({ effect: 'ayuda' })],
      reminders: [reminder({ active: true })],
    })
    expect(buildNudges(data)).toEqual([])
  })

  it('pone primero lo más urgente', () => {
    const data = snapshot({
      entries: [entry({ kind: 'examen', occurred_at: diasAtras(5) })],
      topics: [topic()],
    })
    const pesos = buildNudges(data).map((n) => n.weight)
    expect(pesos).toEqual([...pesos].sort((a, b) => b - a))
  })
})

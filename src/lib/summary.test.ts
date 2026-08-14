import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSummary, summaryText } from './summary'
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
  vi.setSystemTime(new Date('2026-08-14T15:00:00.000Z'))
})

afterEach(() => vi.useRealTimers())

describe('buildSummary — orden y agregados', () => {
  it('pone los temas activos primero y dentro de eso los que más han pasado', () => {
    const resuelto = topic({ name: 'resuelto', status: 'resuelto' })
    const seguimiento = topic({ name: 'seguimiento', status: 'seguimiento' })
    const activoPoco = topic({ name: 'activo-poco', status: 'activo' })
    const activoMucho = topic({ name: 'activo-mucho', status: 'activo' })
    const data = snapshot({
      topics: [resuelto, seguimiento, activoPoco, activoMucho],
      entries: [
        entry({ topic_id: activoPoco.id }),
        entry({ topic_id: activoMucho.id }),
        entry({ topic_id: activoMucho.id }),
      ],
    })
    expect(buildSummary(data).topics.map((t) => t.topic.name)).toEqual([
      'activo-mucho',
      'activo-poco',
      'seguimiento',
      'resuelto',
    ])
  })

  it('calcula intensidad máxima y promedio ignorando los registros sin intensidad', () => {
    const t = topic()
    const data = snapshot({
      topics: [t],
      entries: [
        entry({ topic_id: t.id, severity: 8 }),
        entry({ topic_id: t.id, severity: 4 }),
        entry({ topic_id: t.id, severity: null }),
      ],
    })
    const s = buildSummary(data).topics[0]
    expect(s.maxSeverity).toBe(8)
    expect(s.avgSeverity).toBe(6)
    expect(s.count).toBe(3)
  })

  it('las preguntas para el médico no cuentan como episodios', () => {
    const t = topic()
    const data = snapshot({
      topics: [t],
      entries: [entry({ topic_id: t.id }), entry({ topic_id: t.id, kind: 'pregunta', title: '¿es grave?' })],
    })
    const s = buildSummary(data)
    expect(s.topics[0].count).toBe(1)
    expect(s.preguntas).toHaveLength(1)
    expect(s.totalEntries).toBe(1)
  })

  it('oculta las preguntas que ella ya marcó como respondidas', () => {
    const data = snapshot({
      entries: [entry({ kind: 'pregunta', title: 'vieja', resolved: true })],
    })
    expect(buildSummary(data).preguntas).toHaveLength(0)
  })

  it('separa lo que no tiene tema', () => {
    const t = topic()
    const data = snapshot({
      topics: [t],
      entries: [entry({ topic_id: t.id }), entry({ topic_id: null, title: 'suelto' })],
    })
    expect(buildSummary(data).general.map((e) => e.title)).toEqual(['suelto'])
  })

  it('agrupa los documentos por tema', () => {
    const t = topic()
    const data = snapshot({
      topics: [t],
      documents: [document({ topic_id: t.id, title: 'rx' }), document({ topic_id: null, title: 'suelto' })],
    })
    const s = buildSummary(data)
    expect(s.topics[0].docs.map((d) => d.title)).toEqual(['rx'])
    expect(s.documents).toHaveLength(2)
  })
})

describe('buildSummary — medicamentos', () => {
  it('distingue los que toma ahora de los que ya dejó', () => {
    const data = snapshot({
      medications: [
        medication({ name: 'actual' }),
        medication({ name: 'pasado', ended_on: fechaAtras(3) }),
      ],
    })
    expect(buildSummary(data).medsActivos.map((m) => m.name)).toEqual(['actual'])
  })

  it('marca como fallidos los que no ayudan y los que caen mal', () => {
    const data = snapshot({
      medications: [
        medication({ name: 'sirve', effect: 'ayuda' }),
        medication({ name: 'no sirve', effect: 'no_ayuda' }),
        medication({ name: 'cae mal', effect: 'empeora' }),
      ],
    })
    expect(buildSummary(data).medsFallidos.map((m) => m.name)).toEqual(['no sirve', 'cae mal'])
  })
})

describe('buildSummary — cumplimiento y trámites', () => {
  it('mide el cumplimiento solo de los medicamentos diarios activos', () => {
    const diario = reminder({ kind: 'tomar', repeat: 'daily', title: 'tomar' })
    const puntual = reminder({ kind: 'tomar', repeat: 'none', title: 'una vez' })
    const inactivo = reminder({ kind: 'tomar', repeat: 'daily', active: false })
    const data = snapshot({
      reminders: [diario, puntual, inactivo],
      reminderLogs: [log(diario.id, HOY), log(diario.id, fechaAtras(1))],
    })
    const a = buildSummary(data).adherencia
    expect(a).toHaveLength(1)
    expect(a[0].done).toBe(2)
  })

  it('lista como trámites lo que está pendiente de reclamar o hacerse', () => {
    const reclamar = reminder({ kind: 'reclamar', repeat: 'none', due_on: fechaAtras(4), title: 'EPS' })
    const tomar = reminder({ kind: 'tomar', repeat: 'daily', title: 'pastilla' })
    const data = snapshot({ reminders: [reclamar, tomar] })
    const t = buildSummary(data).tramites
    expect(t.map((x) => x.reminder.title)).toEqual(['EPS'])
    expect(t[0].overdue).toBe(4)
  })
})

describe('summaryText', () => {
  const armar = () => {
    const t = topic({ name: 'Sangrado seno derecho', started_on: fechaAtras(40), description: 'empezó de repente' })
    const rem = reminder({ kind: 'tomar', repeat: 'daily', title: 'Tomar ibuprofeno' })
    return snapshot({
      profile: profile({ full_name: 'Ana Vargas', allergies: 'penicilina', insurance: 'Sura' }),
      topics: [t],
      entries: [
        entry({ topic_id: t.id, severity: 7, title: 'sangró', note: 'manchó el brasier', occurred_at: diasAtras(2) }),
        entry({ kind: 'pregunta', title: '¿necesito ecografía?' }),
      ],
      medications: [medication({ name: 'Ibuprofeno', topic_id: t.id, effect: 'no_ayuda' })],
      documents: [document({ topic_id: t.id, kind: 'radiografia', title: 'RX columna', doc_date: fechaAtras(30) })],
      reminders: [rem, reminder({ kind: 'reclamar', repeat: 'none', due_on: fechaAtras(2), title: 'Reclamar en EPS' })],
      reminderLogs: [log(rem.id, HOY)],
    })
  }

  it('encabeza con los datos que el médico pregunta de entrada', () => {
    const data = armar()
    const texto = summaryText(data, buildSummary(data))
    expect(texto).toContain('Paciente: Ana Vargas')
    expect(texto).toContain('Alergias: penicilina')
    expect(texto).toContain('EPS / seguro: Sura')
  })

  it('incluye el tema con desde cuándo, los episodios y sus documentos', () => {
    const data = armar()
    const texto = summaryText(data, buildSummary(data))
    expect(texto).toContain('SANGRADO SENO DERECHO')
    expect(texto).toContain('empezó de repente')
    expect(texto).toContain('[7/10]')
    expect(texto).toContain('manchó el brasier')
    expect(texto).toContain('Radiografía: RX columna')
  })

  it('deja claro lo que ya probó y no le sirvió', () => {
    const data = armar()
    const texto = summaryText(data, buildSummary(data))
    expect(texto).toContain('YA PROBÓ Y NO LE SIRVIÓ')
    expect(texto).toContain('Ibuprofeno')
  })

  it('reporta cumplimiento y trámites pendientes', () => {
    const data = armar()
    const texto = summaryText(data, buildSummary(data))
    expect(texto).toContain('Tomar ibuprofeno: 1 de 30 días')
    expect(texto).toContain('TRÁMITES PENDIENTES')
    expect(texto).toContain('atrasado 2 días')
  })

  it('termina con las preguntas que ella quiere hacer', () => {
    const data = armar()
    const texto = summaryText(data, buildSummary(data))
    expect(texto).toContain('PREGUNTAS PARA EL MÉDICO')
    expect(texto).toContain('¿necesito ecografía?')
  })

  it('no imprime secciones vacías', () => {
    const vacio = snapshot()
    const texto = summaryText(vacio, buildSummary(vacio))
    expect(texto).not.toContain('TRÁMITES')
    expect(texto).not.toContain('YA PROBÓ')
    expect(texto).toContain('RESUMEN DE SALUD')
  })
})

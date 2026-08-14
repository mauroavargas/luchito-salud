import { describe, expect, it } from 'vitest'
import { dayKey, fmtDate, fmtDayHeader, fromLocalInput, severityLabel, since, toLocalInput } from './format'

describe('fmtDate', () => {
  it('no corre un día las fechas sin hora', () => {
    // El bug clásico: "2026-08-14" leído como medianoche UTC cae el 13 en Colombia.
    expect(fmtDate('2026-08-14')).toBe('14 de agosto de 2026')
  })

  it('respeta la hora local en las fechas con hora', () => {
    // 02:00 UTC del 15 son las 21:00 del 14 en Bogotá.
    expect(fmtDate('2026-08-15T02:00:00.000Z')).toBe('14 de agosto de 2026')
  })

  it('devuelve un guion cuando no hay fecha', () => {
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate(undefined)).toBe('—')
  })
})

describe('since', () => {
  it('describe fechas sin hora sin desfase', () => {
    const hoy = new Date().toISOString().slice(0, 10)
    expect(since(hoy)).toBe('hoy')
  })

  it('usa singular y plural correctos', () => {
    const hace = (n: number) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d.toISOString()
    }
    expect(since(hace(1))).toBe('hace 1 día')
    expect(since(hace(5))).toBe('hace 5 días')
    expect(since(hace(60))).toBe('hace 2 meses')
    expect(since(hace(400))).toBe('hace 1 año')
  })

  it('devuelve vacío sin fecha', () => {
    expect(since(null)).toBe('')
  })
})

describe('fmtDayHeader', () => {
  it('dice Hoy y Ayer en vez de la fecha', () => {
    const hoy = new Date()
    const ayer = new Date()
    ayer.setDate(hoy.getDate() - 1)
    expect(fmtDayHeader(hoy.toISOString())).toBe('Hoy')
    expect(fmtDayHeader(ayer.toISOString())).toBe('Ayer')
  })
})

describe('dayKey', () => {
  it('agrupa por día local, no UTC', () => {
    // 01:00 UTC del 15 sigue siendo el 14 en Bogotá: debe agrupar con el 14.
    expect(dayKey('2026-08-15T01:00:00.000Z')).toBe('2026-08-14')
  })
})

describe('toLocalInput / fromLocalInput', () => {
  it('van y vuelven sin perder el minuto elegido', () => {
    const d = new Date('2026-08-14T15:30:00.000Z')
    const input = toLocalInput(d)
    expect(input).toBe('2026-08-14T10:30')
    expect(new Date(fromLocalInput(input)).getTime()).toBe(d.getTime())
  })
})

describe('severityLabel', () => {
  it('traduce la escala a palabras que ella usaría', () => {
    expect(severityLabel(0)).toBe('sin dolor')
    expect(severityLabel(2)).toBe('leve')
    expect(severityLabel(5)).toBe('moderado')
    expect(severityLabel(8)).toBe('fuerte')
    expect(severityLabel(10)).toBe('insoportable')
    expect(severityLabel(null)).toBe('')
  })
})

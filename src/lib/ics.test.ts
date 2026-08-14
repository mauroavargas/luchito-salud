import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reminderToIcs } from './ics'
import { reminder, resetIds } from '../test/factories'

beforeEach(() => {
  resetIds()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-14T15:00:00.000Z')) // 10:00 en Bogotá
})

afterEach(() => vi.useRealTimers())

describe('reminderToIcs', () => {
  it('arma un evento válido con alarma', () => {
    const ics = reminderToIcs(reminder({ title: 'Reclamar en la EPS', due_on: '2026-08-20', due_time: '08:00' }))
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('SUMMARY:Reclamar en la EPS')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT10M')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('convierte la hora local de Bogotá a UTC', () => {
    const ics = reminderToIcs(reminder({ due_on: '2026-08-20', due_time: '08:00' }))
    // 08:00 en Bogotá (UTC-5) son las 13:00 UTC.
    expect(ics).toContain('DTSTART:20260820T130000Z')
    expect(ics).toContain('DTEND:20260820T131500Z')
  })

  it('traduce la repetición a RRULE', () => {
    expect(reminderToIcs(reminder({ repeat: 'daily' }))).toContain('RRULE:FREQ=DAILY')
    expect(reminderToIcs(reminder({ repeat: 'weekly' }))).toContain('RRULE:FREQ=WEEKLY')
    expect(reminderToIcs(reminder({ repeat: 'monthly' }))).toContain('RRULE:FREQ=MONTHLY')
  })

  it('no repite lo que es de una sola vez', () => {
    expect(reminderToIcs(reminder({ repeat: 'none' }))).not.toContain('RRULE')
  })

  it('sin fecha lo programa para el próximo turno, no en el pasado', () => {
    // Son las 10:00 y la hora por defecto es 08:00, así que toca mañana.
    const ics = reminderToIcs(reminder({ due_on: null, due_time: null }))
    expect(ics).toContain('DTSTART:20260815T130000Z')
  })

  it('escapa las comas y los puntos y coma del título', () => {
    const ics = reminderToIcs(reminder({ title: 'Llevar orden, cédula; y carné' }))
    expect(ics).toContain('SUMMARY:Llevar orden\\, cédula\\; y carné')
  })

  it('mete el tipo y la nota en la descripción', () => {
    const ics = reminderToIcs(reminder({ kind: 'reclamar', notes: 'llevar la orden' }))
    expect(ics).toContain('DESCRIPTION:Reclamar en la EPS — llevar la orden')
  })

  it('separa las líneas con CRLF como pide el estándar', () => {
    expect(reminderToIcs(reminder())).toContain('\r\n')
  })
})

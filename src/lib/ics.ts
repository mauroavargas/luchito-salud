import type { Reminder } from '../types'
import { REM_LABEL } from '../types'

/**
 * La app no puede mandar notificaciones al celular por sí sola (haría falta un
 * servidor de push). En vez de eso genera un evento de calendario: el celular
 * es el que avisa, que es lo que de verdad funciona.
 */
function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
  )
}

function escape(text: string): string {
  return text.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

export function reminderToIcs(r: Reminder): string {
  const [hh, mm] = (r.due_time || '08:00').split(':').map((x) => parseInt(x, 10))
  const start = r.due_on ? new Date(`${r.due_on}T00:00:00`) : new Date()
  start.setHours(isNaN(hh) ? 8 : hh, isNaN(mm) ? 0 : mm, 0, 0)
  if (!r.due_on && start.getTime() < Date.now()) start.setDate(start.getDate() + 1)
  const end = new Date(start.getTime() + 15 * 60000)

  const rrule =
    r.repeat === 'daily'
      ? 'RRULE:FREQ=DAILY'
      : r.repeat === 'weekly'
        ? 'RRULE:FREQ=WEEKLY'
        : r.repeat === 'monthly'
          ? 'RRULE:FREQ=MONTHLY'
          : null

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mi Historial de Salud//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${r.id}@historial-salud`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(r.title)}`,
    `DESCRIPTION:${escape(`${REM_LABEL[r.kind]}${r.notes ? ` — ${r.notes}` : ''}`)}`,
    ...(rrule ? [rrule] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(r.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadIcs(r: Reminder) {
  const blob = new Blob([reminderToIcs(r)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recordatorio-${r.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

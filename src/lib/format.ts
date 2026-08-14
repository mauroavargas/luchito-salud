const LOCALE = 'es-CO'

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}, ${d.toLocaleTimeString(
    LOCALE,
    { hour: 'numeric', minute: '2-digit' },
  )}`
}

/** "hoy", "ayer", o la fecha larga. Para encabezados de agrupación. */
export function fmtDayHeader(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return 'Hoy'
  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)
  if (same(d, yest)) return 'Ayer'
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "hace 3 días" — para decir desde cuándo pasa algo. */
export function since(iso: string | null | undefined): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 31) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(days / 365)
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}

export function severityLabel(n: number | null): string {
  if (n === null || n === undefined) return ''
  if (n === 0) return 'sin dolor'
  if (n <= 3) return 'leve'
  if (n <= 6) return 'moderado'
  if (n <= 8) return 'fuerte'
  return 'insoportable'
}

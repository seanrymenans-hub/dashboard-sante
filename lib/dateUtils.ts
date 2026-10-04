export const APP_TIMEZONE = 'Europe/Brussels'

export function dateKey(value: Date | string | number = new Date()): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null
  const [y, m, d] = key.split('-').map(Number)
  // Midi UTC évite les décalages de jour autour des changements d'heure.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export function daysBetween(a: string, b: string): number {
  const da = parseDateKey(a)
  const db = parseDateKey(b)
  if (!da || !db) return Infinity
  return Math.abs(db.getTime() - da.getTime()) / 86400000
}

export function daysAgo(key: string, today = dateKey()): number {
  const d = parseDateKey(key)
  const t = parseDateKey(today)
  if (!d || !t) return Infinity
  return (t.getTime() - d.getTime()) / 86400000
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key)
  if (!d) return key
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

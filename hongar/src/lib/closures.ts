// Betriebsurlaub: Datumshelfer für Banner, Öffnungszeiten und Verwaltung.
// Daten kommen als "YYYY-MM-DD" (lokales Datum, von/bis jeweils inklusive).

import type { HongarClosure } from './types'

// Ab so vielen Tagen vor Beginn erscheint das Banner oben auf jeder Seite.
const BANNER_LEAD_DAYS = 60

const pad = (n: number) => String(n).padStart(2, '0')

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayIso(): string {
  return isoDate(new Date())
}

export function parseIso(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(value: string, days: number): string {
  const d = parseIso(value)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function isCurrent(c: HongarClosure, today = todayIso()): boolean {
  return c.start_date <= today && today <= c.end_date
}

/** Tag, an dem wieder geöffnet ist (Tag nach dem Ende). */
export function reopenDate(c: HongarClosure): Date {
  return parseIso(addDays(c.end_date, 1))
}

/** Laufender oder bald beginnender Betriebsurlaub fürs Banner. */
export function bannerClosure(closures: HongarClosure[], today = todayIso()): HongarClosure | undefined {
  const limit = addDays(today, BANNER_LEAD_DAYS)
  return closures.find(c => c.end_date >= today && c.start_date <= limit)
}

const longFormat = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
const longYearFormat = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortFormat = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' })
const shortYearFormat = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatLong(d: Date): string {
  return (d.getFullYear() === new Date().getFullYear() ? longFormat : longYearFormat).format(d)
}

/** "3. – 16. November 2026", "30. Dezember 2026 – 6. Jänner 2027", "24. Dezember 2026" */
export function formatRange(c: HongarClosure): string {
  const start = parseIso(c.start_date)
  const end = parseIso(c.end_date)
  if (c.start_date === c.end_date) return shortYearFormat.format(end)
  if (start.getFullYear() !== end.getFullYear()) return `${shortYearFormat.format(start)} – ${shortYearFormat.format(end)}`
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}. – ${shortYearFormat.format(end)}`
  return `${shortFormat.format(start)} – ${shortYearFormat.format(end)}`
}

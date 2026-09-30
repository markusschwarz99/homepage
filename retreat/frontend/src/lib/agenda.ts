import type { RetreatEvent } from './types'

// Alle Zeiten sind lokale Zeit Teneriffa ohne Offset ("2026-10-19T07:00").
// Vergleiche laufen daher direkt auf den Strings (ISO sortiert lexikalisch).
export const TIME_ZONE = 'Atlantic/Canary'
/** Zweite Zeitzone für die Anzeige (Heimat) */
export const HOME_ZONE = 'Europe/Vienna'

const NOW_KEY = 'retreat_now'
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** Uhrzeit (Default: Teneriffa) als "YYYY-MM-DDTHH:MM", unabhängig von der Gerätezeitzone. */
export function localNow(date: Date = new Date(), timeZone: string = TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** Debug: ?now=2026-10-19T10:15 überschreibt die Uhrzeit (pro Tab), ?now= löscht. */
export function initNowOverride() {
  const value = new URLSearchParams(window.location.search).get('now')
  if (value === null) return
  try {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) sessionStorage.setItem(NOW_KEY, value)
    else sessionStorage.removeItem(NOW_KEY)
  } catch {
    // ohne sessionStorage kein Override
  }
}

export function currentNow(): string {
  try {
    return sessionStorage.getItem(NOW_KEY) ?? localNow()
  } catch {
    return localNow()
  }
}

export function sortEvents(events: RetreatEvent[]): RetreatEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
}

export type Phase = 'before' | 'during' | 'after'

export interface NowNext {
  phase: Phase
  current: RetreatEvent[]
  next: RetreatEvent | null
}

export function nowAndNext(events: RetreatEvent[], now: string): NowNext {
  const sorted = sortEvents(events)
  const current = sorted.filter(e => e.start <= now && now < e.end)
  const next = sorted.find(e => e.start > now) ?? null
  const first = sorted[0]
  const last = sorted.reduce((m, e) => (e.end > m ? e.end : m), '')
  const phase: Phase = !first || now < first.start ? 'before' : now >= last ? 'after' : 'during'
  return { phase, current, next }
}

export function dayOf(dt: string): string {
  return dt.slice(0, 10)
}

export function timeOf(dt: string): string {
  return dt.slice(11, 16)
}

export function retreatDays(events: RetreatEvent[]): string[] {
  return [...new Set(events.map(e => dayOf(e.start)))].sort()
}

export function eventsOn(events: RetreatEvent[], day: string): RetreatEvent[] {
  return sortEvents(events.filter(e => dayOf(e.start) === day))
}

/** Tag, der beim Öffnen gezeigt wird: heute, sonst erster bzw. letzter Tag. */
export function defaultDay(days: string[], now: string): string {
  const today = dayOf(now)
  if (days.includes(today)) return today
  return today > (days[days.length - 1] ?? '') ? days[days.length - 1] : days[0]
}

function toUtcMs(dt: string): number {
  const [d, t = '00:00'] = dt.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  return Date.UTC(y, mo - 1, da, h, mi)
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  return toUtcMs(localNow(new Date(utcMs), timeZone)) - utcMs
}

/** Teneriffa-Ortszeit -> Ortszeit in `timeZone` (DST-sicher über Intl). */
export function convertZone(dt: string, timeZone: string = HOME_ZONE): string {
  const naive = toUtcMs(dt)
  let utc = naive - zoneOffsetMs(naive, TIME_ZONE)
  utc = naive - zoneOffsetMs(utc, TIME_ZONE)
  return localNow(new Date(utc), timeZone)
}

export function minutesBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 60000)
}

/** "in 25 Min", "in 2 Std 5 Min", "in 3 Tagen" */
export function formatDistance(minutes: number): string {
  if (minutes < 60) return `in ${minutes} Min`
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `in ${h} Std ${m} Min` : `in ${h} Std`
  }
  const days = Math.round(minutes / (24 * 60))
  return days === 1 ? 'in 1 Tag' : `in ${days} Tagen`
}

/** "2026-10-19" -> "Mo 19.10." */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${weekday} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`
}


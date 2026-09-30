// "Zum Kalender hinzufügen" für Veranstaltungen – rein im Browser erzeugt:
// eine .ics-Datei (Apple, Outlook, Android-Kalender) und ein Google-Kalender-Link.
//
// Die Uhrzeit ist im Backend Freitext (time_label, z.B. "10 Uhr", "10:30 Uhr",
// "10–16 Uhr"). Lässt sich daraus keine Zeit lesen, wird ein ganztägiger Termin
// angelegt; ohne Endzeit dauert ein Termin DEFAULT_HOURS Stunden.

import { HONGAR_LATLNG, SITE_NAME } from '../config'
import type { HongarEvent } from './types'

const TZID = 'Europe/Vienna'
const DEFAULT_HOURS = 2
const LOCATION = `${SITE_NAME} am Hongar`

interface Time {
  h: number
  m: number
}

// "10 Uhr", "10:30 Uhr", "ab 10.30 Uhr", "10 - 16 Uhr", "10:00–16:00"
const TIME_RE = /(\d{1,2})(?:[:.](\d{2}))?(?:\s*(?:uhr|h))?\s*(?:[-–]\s*(\d{1,2})(?:[:.](\d{2}))?)?\s*(?:uhr|h)\b|(\d{1,2})[:.](\d{2})(?:\s*[-–]\s*(\d{1,2})[:.](\d{2}))?/i

function time(h?: string, m?: string): Time | null {
  if (h === undefined) return null
  const t = { h: Number(h), m: Number(m ?? 0) }
  return t.h < 24 && t.m < 60 ? t : null
}

export function parseTimeLabel(label: string): { start: Time; end: Time | null } | null {
  const match = TIME_RE.exec(label)
  if (!match) return null
  const [, h1, m1, h2, m2, h3, m3, h4, m4] = match
  const start = time(h1 ?? h3, m1 ?? m3)
  if (!start) return null
  const end = time(h2 ?? h4, m2 ?? m4)
  return { start, end: end && end.h * 60 + end.m > start.h * 60 + start.m ? end : null }
}

const pad = (n: number) => String(n).padStart(2, '0')

function dateParts(value: string): [number, number, number] {
  const [y, m, d] = value.split('-').map(Number)
  return [y, m, d]
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function formatLocal(d: Date): string {
  return `${formatDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

/** Start/Ende als lokale Zeiten (Wanduhr am Hongar) bzw. als Tage bei ganztägig. */
function range(event: HongarEvent): { allDay: boolean; start: Date; end: Date } {
  const [y, m, d] = dateParts(event.event_date)
  const parsed = parseTimeLabel(event.time_label)
  if (!parsed) return { allDay: true, start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) }
  const { start, end } = parsed
  return {
    allDay: false,
    start: new Date(y, m - 1, d, start.h, start.m),
    end: end ? new Date(y, m - 1, d, end.h, end.m) : new Date(y, m - 1, d, start.h + DEFAULT_HOURS, start.m),
  }
}

function details(event: HongarEvent, allDay: boolean): string {
  // Bei ganztägigen Terminen steht eine nicht lesbare Zeitangabe ("nachmittags") im Text.
  const label = allDay && event.time_label.trim() ? event.time_label.trim() : ''
  return [label, event.description.trim()].filter(Boolean).join('\n\n')
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Zeilen dürfen höchstens 75 Byte lang sein (RFC 5545), Folgezeilen beginnen mit Leerzeichen.
function fold(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

export function eventIcs(event: HongarEvent, url: string, now = new Date()): string {
  const { allDay, start, end } = range(event)
  const text = details(event, allDay)
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${SITE_NAME}//Veranstaltungen//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(allDay ? [] : VTIMEZONE),
    'BEGIN:VEVENT',
    `UID:hongar-event-${event.id}@${new URL(url).host}`,
    `DTSTAMP:${stamp}`,
    ...(allDay
      ? [`DTSTART;VALUE=DATE:${formatDate(start)}`, `DTEND;VALUE=DATE:${formatDate(end)}`]
      : [`DTSTART;TZID=${TZID}:${formatLocal(start)}`, `DTEND;TZID=${TZID}:${formatLocal(end)}`]),
    `SUMMARY:${escapeText(event.title)}`,
    ...(text ? [`DESCRIPTION:${escapeText(text)}`] : []),
    `LOCATION:${escapeText(LOCATION)}`,
    `GEO:${HONGAR_LATLNG[0]};${HONGAR_LATLNG[1]}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(event: HongarEvent, url: string): string {
  const { allDay, start, end } = range(event)
  const text = details(event, allDay)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: allDay ? `${formatDate(start)}/${formatDate(end)}` : `${formatLocal(start)}/${formatLocal(end)}`,
    ctz: TZID,
    details: text ? `${text}\n\n${url}` : url,
    location: LOCATION,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'veranstaltung'}.ics`
}

export function downloadIcs(event: HongarEvent, url: string) {
  const blob = new Blob([eventIcs(event, url)], { type: 'text/calendar;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName(event.title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

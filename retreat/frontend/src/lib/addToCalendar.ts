// „Zum Kalender hinzufügen“ – rein im Browser: Outlook-Web-Link (Microsoft 365)
// und eine .ics-Datei (Outlook-Desktop, Apple, Android).
// Termine sind Teneriffa-Ortszeit; nach außen gehen sie als UTC, damit jeder
// Kalender sie in seiner eigenen Zeitzone richtig anzeigt.

import { convertZone } from './agenda'
import type { Place, RetreatEvent } from './types'

/** "2026-10-19T07:00" (Teneriffa) -> "2026-10-19T06:00:00Z" */
export function toUtcIso(dt: string): string {
  return `${convertZone(dt, 'UTC')}:00Z`
}

function location(place?: Place): string {
  return place ? [place.name, place.address].filter(Boolean).join(', ') : ''
}

function description(event: RetreatEvent): string {
  return [event.note, event.url, event.maps_url].filter(Boolean).join('\n\n')
}

export function outlookUrl(event: RetreatEvent, place?: Place): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: toUtcIso(event.start),
    enddt: toUtcIso(event.end),
    body: description(event),
    location: location(place),
  })
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params}`
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Zeilen höchstens 75 Byte (RFC 5545), Folgezeilen beginnen mit Leerzeichen.
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

const icsTime = (dt: string) => toUtcIso(dt).replace(/[-:]/g, '')

export function eventIcs(event: RetreatEvent, place?: Place, now = new Date()): string {
  const text = description(event)
  const loc = location(place)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Teamretreat//Termine//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:retreat-event-${event.id}@rp.markus-schwarz.cc`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${icsTime(event.start)}`,
    `DTEND:${icsTime(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(text ? [`DESCRIPTION:${escapeText(text)}`] : []),
    ...(loc ? [`LOCATION:${escapeText(loc)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
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
  return `${slug || 'termin'}.ics`
}

export function downloadIcs(event: RetreatEvent, place?: Place) {
  const blob = new Blob([eventIcs(event, place)], { type: 'text/calendar;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName(event.title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

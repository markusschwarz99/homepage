import { describe, expect, it } from 'vitest'
import { eventIcs, outlookUrl, toUtcIso } from './addToCalendar'
import type { Place, RetreatEvent } from './types'

const EVENT: RetreatEvent = {
  id: 7,
  start: '2026-10-19T07:00',
  end: '2026-10-19T08:30',
  title: 'Frühstück, gemeinsam',
  category: 'meal',
  place: 'hotel',
  note: 'Zeile 1\nZeile 2',
  maps_url: null,
  url: 'https://example.com/menu',
  coordinator_id: null,
  participant_ids: [],
}
const PLACE: Place = { id: 'hotel', name: 'Hotel', address: 'Calle 1', phone: null, distance: null, url: null }

describe('toUtcIso', () => {
  it('rechnet Teneriffa-Sommerzeit (UTC+1) nach UTC', () => {
    expect(toUtcIso('2026-10-19T07:00')).toBe('2026-10-19T06:00:00Z')
  })
  it('rechnet Teneriffa-Winterzeit (UTC+0) nach UTC', () => {
    expect(toUtcIso('2026-12-01T07:00')).toBe('2026-12-01T07:00:00Z')
  })
  it('wechselt über Mitternacht den Tag', () => {
    expect(toUtcIso('2026-10-20T00:30')).toBe('2026-10-19T23:30:00Z')
  })
})

describe('outlookUrl', () => {
  it('baut den Outlook-Deeplink mit UTC-Zeiten', () => {
    const url = new URL(outlookUrl(EVENT, PLACE))
    expect(url.origin + url.pathname).toBe('https://outlook.office.com/calendar/0/deeplink/compose')
    expect(url.searchParams.get('rru')).toBe('addevent')
    expect(url.searchParams.get('subject')).toBe('Frühstück, gemeinsam')
    expect(url.searchParams.get('startdt')).toBe('2026-10-19T06:00:00Z')
    expect(url.searchParams.get('enddt')).toBe('2026-10-19T07:30:00Z')
    expect(url.searchParams.get('location')).toBe('Hotel, Calle 1')
    expect(url.searchParams.get('body')).toBe('Zeile 1\nZeile 2\n\nhttps://example.com/menu')
  })
})

describe('eventIcs', () => {
  it('erzeugt einen VEVENT in UTC mit escapetem Text', () => {
    const ics = eventIcs(EVENT, PLACE, new Date('2026-10-01T10:00:00Z'))
    const lines = ics.split('\r\n')
    expect(lines).toContain('UID:retreat-event-7@rp.markus-schwarz.cc')
    expect(lines).toContain('DTSTAMP:20261001T100000Z')
    expect(lines).toContain('DTSTART:20261019T060000Z')
    expect(lines).toContain('DTEND:20261019T073000Z')
    expect(lines).toContain('SUMMARY:Frühstück\\, gemeinsam')
    expect(lines).toContain('LOCATION:Hotel\\, Calle 1')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})

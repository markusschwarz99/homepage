import { describe, expect, it } from 'vitest'
import {
  convertZone,
  isMine,
  defaultDay,
  eventsOn,
  formatDay,
  formatDistance,
  localNow,
  minutesBetween,
  nowAndNext,
  retreatDays,
} from './agenda'
import type { RetreatEvent } from './types'

const NO_ACTIVITY = { maps_url: null, url: null, coordinator_id: null, participant_ids: [] }

function ev(start: string, end: string, title = start): RetreatEvent {
  return { id: 0, start, end, title, category: 'work', place: null, note: null, ...NO_ACTIVITY }
}

const events = [
  ev('2026-10-19T08:00', '2026-10-19T12:00', 'Arbeitsblock'),
  ev('2026-10-18T15:00', '2026-10-18T17:00', 'Kick-off'),
  ev('2026-10-19T07:00', '2026-10-19T08:00', 'Frühstück'),
  ev('2026-10-19T12:00', '2026-10-19T13:30', 'Mittag'),
  ev('2026-10-23T11:00', '2026-10-23T14:25', 'Abreise'),
]

describe('localNow', () => {
  it('rechnet in die Kanaren-Zeit um (WEST = UTC+1 im Oktober)', () => {
    expect(localNow(new Date('2026-10-19T09:30:00Z'))).toBe('2026-10-19T10:30')
  })
  it('kippt um Mitternacht auf den nächsten Tag', () => {
    expect(localNow(new Date('2026-10-19T23:15:00Z'))).toBe('2026-10-20T00:15')
  })
})

describe('convertZone', () => {
  it('Teneriffa -> Österreich ist im Oktober +1 h (WEST/CEST)', () => {
    expect(convertZone('2026-10-19T07:00')).toBe('2026-10-19T08:00')
  })
  it('über Mitternacht', () => {
    expect(convertZone('2026-10-19T23:30')).toBe('2026-10-20T00:30')
  })
  it('auch nach der Zeitumstellung (25.10.) +1 h (WET/CET)', () => {
    expect(convertZone('2026-10-26T12:00')).toBe('2026-10-26T13:00')
  })
  it('Sommer: +1 h', () => {
    expect(convertZone('2026-07-01T12:00')).toBe('2026-07-01T13:00')
  })
})

describe('nowAndNext', () => {
  it('findet laufendes und nächstes Event', () => {
    const r = nowAndNext(events, '2026-10-19T09:00')
    expect(r.phase).toBe('during')
    expect(r.current.map(e => e.title)).toEqual(['Arbeitsblock'])
    expect(r.next?.title).toBe('Mittag')
  })
  it('Grenze: Ende ist exklusiv, Start inklusiv', () => {
    const r = nowAndNext(events, '2026-10-19T08:00')
    expect(r.current.map(e => e.title)).toEqual(['Arbeitsblock'])
    expect(r.next?.title).toBe('Mittag')
  })
  it('Lücke zwischen Events: nichts läuft, nächstes ist gesetzt', () => {
    const r = nowAndNext(events, '2026-10-18T22:00')
    expect(r.phase).toBe('during')
    expect(r.current).toEqual([])
    expect(r.next?.title).toBe('Frühstück')
  })
  it('überlappende Events laufen parallel', () => {
    const r = nowAndNext(
      [...events, ev('2026-10-19T10:00', '2026-10-19T11:00', 'Padel')],
      '2026-10-19T10:30',
    )
    expect(r.current.map(e => e.title)).toEqual(['Arbeitsblock', 'Padel'])
  })
  it('vor dem Retreat', () => {
    const r = nowAndNext(events, '2026-10-01T12:00')
    expect(r.phase).toBe('before')
    expect(r.next?.title).toBe('Kick-off')
  })
  it('nach dem Retreat', () => {
    const r = nowAndNext(events, '2026-10-23T14:25')
    expect(r.phase).toBe('after')
    expect(r.current).toEqual([])
    expect(r.next).toBeNull()
  })
})

describe('Tage', () => {
  it('listet Tage sortiert und filtert Events je Tag', () => {
    expect(retreatDays(events)).toEqual(['2026-10-18', '2026-10-19', '2026-10-23'])
    expect(eventsOn(events, '2026-10-19').map(e => e.title)).toEqual([
      'Frühstück',
      'Arbeitsblock',
      'Mittag',
    ])
  })
  it('wählt heute, sonst ersten bzw. letzten Tag', () => {
    const days = retreatDays(events)
    expect(defaultDay(days, '2026-10-19T09:00')).toBe('2026-10-19')
    expect(defaultDay(days, '2026-10-01T09:00')).toBe('2026-10-18')
    expect(defaultDay(days, '2026-11-01T09:00')).toBe('2026-10-23')
  })
})

describe('Formatierung', () => {
  it('Wochentag und Datum', () => {
    expect(formatDay('2026-10-18')).toBe('So 18.10.')
    expect(formatDay('2026-10-23')).toBe('Fr 23.10.')
  })
  it('Abstände', () => {
    expect(minutesBetween('2026-10-19T23:30', '2026-10-20T00:15')).toBe(45)
    expect(formatDistance(45)).toBe('in 45 Min')
    expect(formatDistance(125)).toBe('in 2 Std 5 Min')
    expect(formatDistance(120)).toBe('in 2 Std')
    expect(formatDistance(18 * 24 * 60)).toBe('in 18 Tagen')
  })
})

describe('isMine (Mein Kalender)', () => {
  const base = ev('2026-10-20T15:00', '2026-10-20T17:00')
  it('Arbeitsblock/Mahlzeit/Transfer ohne Eintragung: alle', () => {
    expect(isMine({ ...base, category: 'work' }, 7)).toBe(true)
    expect(isMine({ ...base, category: 'meal' }, 7)).toBe(true)
    expect(isMine({ ...base, category: 'travel' }, 7)).toBe(true)
  })
  it('Aktivität ohne Eintragung: niemand', () => {
    expect(isMine({ ...base, category: 'activity' }, 7)).toBe(false)
  })
  it('eingetragene Teilnehmende schränken ein – bei jeder Kategorie', () => {
    expect(isMine({ ...base, category: 'activity', participant_ids: [7] }, 7)).toBe(true)
    expect(isMine({ ...base, category: 'travel', participant_ids: [3] }, 7)).toBe(false)
  })
  it('Koordination zählt immer', () => {
    expect(isMine({ ...base, category: 'activity', coordinator_id: 7 }, 7)).toBe(true)
    expect(isMine({ ...base, category: 'meal', participant_ids: [3], coordinator_id: 7 }, 7)).toBe(true)
  })
})

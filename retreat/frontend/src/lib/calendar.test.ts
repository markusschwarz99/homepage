import { describe, expect, it } from 'vitest'
import { hourRange, layoutDay, minutesOfDay } from './calendar'
import type { RetreatEvent } from './types'

let id = 0
function ev(start: string, end: string): RetreatEvent {
  return {
    id: ++id,
    start: `2026-10-19T${start}`,
    end: `2026-10-19T${end}`,
    title: start,
    category: 'work',
    place: null,
    note: null,
  }
}

const lanes = (events: RetreatEvent[]) =>
  layoutDay(events).map(p => `${p.event.title}:${p.lane}/${p.lanes}`)

describe('layoutDay', () => {
  it('nicht überlappende Termine nutzen die volle Breite', () => {
    expect(lanes([ev('08:00', '12:00'), ev('12:00', '13:30')])).toEqual(['08:00:0/1', '12:00:0/1'])
  })
  it('überlappende Termine teilen sich die Breite', () => {
    expect(lanes([ev('10:00', '12:00'), ev('10:30', '11:00'), ev('11:00', '13:00')])).toEqual([
      '10:00:0/2',
      '10:30:1/2',
      '11:00:1/2',
    ])
  })
  it('Gruppe endet, wenn nichts mehr überlappt', () => {
    expect(lanes([ev('08:00', '09:00'), ev('08:30', '09:30'), ev('10:00', '11:00')])).toEqual([
      '08:00:0/2',
      '08:30:1/2',
      '10:00:0/1',
    ])
  })
})

describe('hourRange', () => {
  it('mindestens 07–22 Uhr, erweitert bei frühen/späten Terminen', () => {
    expect(hourRange([ev('08:00', '09:00')])).toEqual([7, 22])
    expect(hourRange([ev('06:15', '09:00'), ev('21:00', '23:10')])).toEqual([6, 24])
  })
  it('Minuten des Tages', () => {
    expect(minutesOfDay('2026-10-19T13:30')).toBe(810)
  })
})

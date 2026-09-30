import type { RetreatEvent } from './types'

export function minutesOfDay(dt: string): number {
  return Number(dt.slice(11, 13)) * 60 + Number(dt.slice(14, 16))
}

/** Sichtbarer Stundenbereich des Kalenders (mind. 07–22 Uhr). */
export function hourRange(events: RetreatEvent[]): [number, number] {
  let from = 7
  let to = 22
  for (const e of events) {
    from = Math.min(from, Math.floor(minutesOfDay(e.start) / 60))
    // Termine über Mitternacht enden optisch um 24:00
    const end = e.end.slice(0, 10) > e.start.slice(0, 10) ? 24 * 60 : minutesOfDay(e.end)
    to = Math.max(to, Math.ceil(end / 60))
  }
  return [from, Math.min(to, 24)]
}

export interface PlacedEvent {
  event: RetreatEvent
  lane: number
  lanes: number
}

/**
 * Überlappende Termine eines Tages nebeneinander anordnen: Gruppen sich
 * überschneidender Termine teilen sich die Breite, jeder bekommt die erste
 * freie Spur.
 */
export function layoutDay(events: RetreatEvent[]): PlacedEvent[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const result: PlacedEvent[] = []
  let group: PlacedEvent[] = []
  let laneEnds: string[] = []
  let groupEnd = ''

  const flush = () => {
    for (const p of group) p.lanes = laneEnds.length
    result.push(...group)
    group = []
    laneEnds = []
  }

  for (const event of sorted) {
    if (group.length && event.start >= groupEnd) flush()
    let lane = laneEnds.findIndex(end => end <= event.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(event.end)
    } else {
      laneEnds[lane] = event.end
    }
    group.push({ event, lane, lanes: 1 })
    groupEnd = group.length === 1 ? event.end : event.end > groupEnd ? event.end : groupEnd
  }
  flush()
  return result
}

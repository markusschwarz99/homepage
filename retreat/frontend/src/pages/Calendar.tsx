import { useState, type MouseEvent } from 'react'
import { Plus } from 'lucide-react'
import { convertZone, dayOf, defaultDay, eventsOn, formatDay, retreatDays, timeOf } from '../lib/agenda'
import { hourRange, layoutDay, minutesOfDay } from '../lib/calendar'
import { useNow, useRetreat } from '../lib/retreat'
import type { EventInput, RetreatEvent } from '../lib/types'
import { EventDialog } from '../components/EventDialog'
import { CATEGORY } from '../components/ui'

const HOUR_PX = 56
const pad = (n: number) => String(n).padStart(2, '0')

type DialogState = { event: RetreatEvent | null; draft?: Pick<EventInput, 'start' | 'end'> }

export function Calendar() {
  const { me, content, places } = useRetreat()
  const now = useNow()
  const days = retreatDays(content.events)
  const [day, setDay] = useState(() => defaultDay(days, now))
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [from, to] = hourRange(content.events)
  const hours = Array.from({ length: to - from }, (_, i) => from + i)
  const height = (to - from) * HOUR_PX
  const refDay = days.includes(day) ? day : days[0]

  const createAt = (d: string, e: MouseEvent<HTMLDivElement>) => {
    if (!me.is_orga) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const h = Math.min(from + Math.floor(y / HOUR_PX), 22)
    setDialog({ event: null, draft: { start: `${d}T${pad(h)}:00`, end: `${d}T${pad(h + 1)}:00` } })
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-grey">
          Zeiten: <strong className="text-black">Teneriffa</strong> (linke Spalte) und{' '}
          <strong className="text-black">Österreich</strong> (rechte Spalte)
        </p>
        {me.is_orga && (
          <button
            type="button"
            onClick={() => setDialog({ event: null, draft: { start: `${refDay}T09:00`, end: `${refDay}T10:00` } })}
            className="inline-flex items-center gap-1 rounded-lg bg-royal-blue px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Termin
          </button>
        )}
      </div>

      {/* Mobil: ein Tag, Umschalter; Desktop: ganze Woche */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {days.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              d === day ? 'bg-royal-blue text-white' : 'bg-white text-black'
            }`}
          >
            {formatDay(d)}
          </button>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Zeitachsen */}
        {(['tfs', 'at'] as const).map(axis => (
          <div key={axis} className={`w-11 shrink-0 ${axis === 'at' ? 'border-r border-grey-25' : ''}`}>
            <div className="flex h-12 items-end justify-center pb-1 text-[11px] font-semibold text-grey">
              {axis === 'tfs' ? 'TFS' : 'AT'}
            </div>
            <div className="relative" style={{ height }}>
              {hours.map(h => {
                const label = axis === 'tfs' ? `${pad(h)}:00` : timeOf(convertZone(`${refDay}T${pad(h)}:00`))
                return (
                  <span
                    key={h}
                    className={`absolute right-1.5 -translate-y-1/2 text-[11px] ${axis === 'tfs' ? 'text-black' : 'text-grey'}`}
                    style={{ top: (h - from) * HOUR_PX }}
                  >
                    {h === from ? '' : label}
                  </span>
                )
              })}
            </div>
          </div>
        ))}

        {/* Tages-Spalten */}
        <div className="flex min-w-0 flex-1">
          {days.map(d => {
            const isToday = d === dayOf(now)
            const nowTop = (minutesOfDay(now) - from * 60) * (HOUR_PX / 60)
            return (
              <div
                key={d}
                className={`min-w-0 flex-1 border-r border-grey-25 last:border-r-0 ${d === day ? '' : 'max-md:hidden'}`}
              >
                <div
                  className={`flex h-12 flex-col items-center justify-center border-b border-grey-25 text-sm ${
                    isToday ? 'bg-royal-blue text-white' : ''
                  }`}
                >
                  <span className="font-semibold">{formatDay(d)}</span>
                </div>
                <div
                  className={`relative ${me.is_orga ? 'cursor-copy' : ''}`}
                  style={{ height }}
                  onClick={e => createAt(d, e)}
                >
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-grey-25"
                      style={{ top: (h - from) * HOUR_PX }}
                    />
                  ))}
                  {layoutDay(eventsOn(content.events, d)).map(({ event, lane, lanes }) => {
                    const start = minutesOfDay(event.start)
                    const end = dayOf(event.end) > d ? 24 * 60 : minutesOfDay(event.end)
                    const top = (start - from * 60) * (HOUR_PX / 60)
                    const h = Math.max((end - start) * (HOUR_PX / 60), 22)
                    const place = event.place ? places.get(event.place) : undefined
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setDialog({ event })
                        }}
                        className={`absolute overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs leading-tight hover:z-10 hover:shadow-md ${
                          CATEGORY[event.category].chip
                        } ${event.end <= now ? 'opacity-60' : ''}`}
                        style={{
                          top: top + 1,
                          height: h - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                        title={`${event.title} · ${timeOf(event.start)}–${timeOf(event.end)} Teneriffa / ${timeOf(
                          convertZone(event.start),
                        )}–${timeOf(convertZone(event.end))} Österreich`}
                      >
                        {/* Schmale Spalten (parallele Termine): Titel umbrechen statt abschneiden */}
                        <span
                          className={`block font-semibold ${lanes > 1 ? 'line-clamp-3 break-words hyphens-auto' : 'truncate'}`}
                        >
                          {event.title}
                        </span>
                        {h >= 38 && lanes < 3 && (
                          <span className="block truncate text-grey">
                            {timeOf(event.start)}–{timeOf(event.end)}
                            <span className="text-grey-75"> · AT {timeOf(convertZone(event.start))}</span>
                          </span>
                        )}
                        {h >= 56 && place && <span className="block truncate text-grey">{place.name}</span>}
                      </button>
                    )
                  })}
                  {isToday && nowTop >= 0 && nowTop <= height && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-royal-blue"
                      style={{ top: nowTop }}
                    >
                      <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-royal-blue" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {dialog && <EventDialog event={dialog.event} draft={dialog.draft} onClose={() => setDialog(null)} />}
    </>
  )
}

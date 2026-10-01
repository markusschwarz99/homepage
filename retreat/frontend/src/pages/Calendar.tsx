import { useRef, useState, type MouseEvent } from 'react'
import { Plus } from 'lucide-react'
import { convertZone, dayOf, defaultDay, eventsOn, formatDay, isMine, retreatDays, timeOf } from '../lib/agenda'
import { hourRange, layoutDay, minutesOfDay } from '../lib/calendar'
import { SCOPE_OPTIONS, useNow, useRetreat, useScope } from '../lib/retreat'
import type { EventInput, RetreatEvent } from '../lib/types'
import { useDaySwipe } from '../lib/useDaySwipe'
import { EventDialog } from '../components/EventDialog'
import { WeekStrip } from '../components/WeekStrip'
import { CATEGORY, Segmented } from '../components/ui'

const HOUR_PX = 56
const pad = (n: number) => String(n).padStart(2, '0')

type DialogState = { event: RetreatEvent | null; draft?: Partial<EventInput> }

export function Calendar() {
  const { me, content, places } = useRetreat()
  const now = useNow()
  const [scope, setScope] = useScope()
  const events = scope === 'mine' ? content.events.filter(e => isMine(e, me.id)) : content.events
  // Tage und Stundenraster immer aus allen Terminen -> Layout springt beim Umschalten nicht
  const days = retreatDays(content.events)
  const [day, setDay] = useState(() => defaultDay(days, now))
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [from, to] = hourRange(content.events)
  const hours = Array.from({ length: to - from }, (_, i) => from + i)
  const height = (to - from) * HOUR_PX
  const refDay = days.includes(day) ? day : days[0]
  const columns = useRef<HTMLDivElement>(null)
  useDaySwipe(
    columns,
    dir => days[days.indexOf(refDay) + dir] !== undefined,
    dir => setDay(days[days.indexOf(refDay) + dir]),
  )

  const createAt = (d: string, e: MouseEvent<HTMLDivElement>) => {
    if (!me.is_orga) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const h = Math.min(from + Math.floor(y / HOUR_PX), 22)
    setDialog({ event: null, draft: { start: `${d}T${pad(h)}:00`, end: `${d}T${pad(h + 1)}:00` } })
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-3">
        <Segmented
          label="Kalender-Auswahl"
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={setScope}
          className="flex-1 md:flex-none"
        />
        {me.is_orga && (
          <button
            type="button"
            onClick={() =>
              setDialog({
                event: null,
                draft: { category: 'activity', start: `${refDay}T15:00`, end: `${refDay}T17:00` },
              })
            }
            aria-label="Neuer Termin"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-royal-blue text-white shadow-sm active:opacity-70"
          >
            <Plus size={22} />
          </button>
        )}
      </div>

      {/* Mobil: ein Tag mit Wochenleiste; Desktop: ganze Woche */}
      <div className="mt-3 rounded-xl bg-white px-2 py-1 md:hidden">
        <WeekStrip days={days} value={day} today={dayOf(now)} onChange={setDay} />
      </div>

      <div className="mt-3 flex overflow-hidden rounded-xl bg-white">
        {/* Zeitachsen */}
        {(['tfs', 'at'] as const).map(axis => (
          <div key={axis} className={`relative z-10 w-11 shrink-0 bg-white ${axis === 'at' ? 'border-r border-grey-25' : ''}`}>
            <div className="flex h-12 items-end justify-center pb-1.5 text-[11px] font-semibold text-grey">
              {axis === 'tfs' ? 'TFS' : 'AT'}
            </div>
            <div className="relative" style={{ height }}>
              {hours.map(h => (
                <span
                  key={h}
                  className={`absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums ${
                    axis === 'tfs' ? 'text-black' : 'text-grey-75'
                  }`}
                  style={{ top: (h - from) * HOUR_PX }}
                >
                  {h === from ? '' : axis === 'tfs' ? `${pad(h)}:00` : timeOf(convertZone(`${refDay}T${pad(h)}:00`))}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Tages-Spalten (mobil: wischen = Tag wechseln) */}
        <div ref={columns} className="flex min-w-0 flex-1 max-md:touch-pan-y">
          {days.map(d => {
            const isToday = d === dayOf(now)
            const nowTop = (minutesOfDay(now) - from * 60) * (HOUR_PX / 60)
            const [weekday, date] = formatDay(d).split(' ')
            return (
              <div
                key={d}
                className={`min-w-0 flex-1 border-r border-grey-25 last:border-r-0 ${d === day ? '' : 'max-md:hidden'}`}
              >
                <div className="flex h-12 items-center justify-center gap-1.5 border-b border-grey-25 text-[15px]">
                  <span className="text-grey">{weekday}</span>
                  <span
                    className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 font-semibold ${
                      isToday ? 'bg-royal-blue text-white' : ''
                    }`}
                  >
                    {Number(date.slice(0, 2))}
                  </span>
                </div>
                <div
                  className={`relative ${me.is_orga ? 'cursor-copy' : ''}`}
                  style={{ height }}
                  onClick={e => createAt(d, e)}
                >
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-grey-25/70"
                      style={{ top: (h - from) * HOUR_PX }}
                    />
                  ))}
                  {layoutDay(eventsOn(events, d)).map(({ event, lane, lanes }) => {
                    const start = minutesOfDay(event.start)
                    const end = dayOf(event.end) > d ? 24 * 60 : minutesOfDay(event.end)
                    const top = (start - from * 60) * (HOUR_PX / 60)
                    const h = Math.max((end - start) * (HOUR_PX / 60), 22)
                    const place = event.place ? places.get(event.place) : undefined
                    const c = CATEGORY[event.category]
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setDialog({ event })
                        }}
                        className={`absolute flex overflow-hidden rounded-md text-left text-[12px] leading-tight active:opacity-70 ${c.tint} ${
                          event.end <= now ? 'opacity-50' : ''
                        }`}
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
                        <span className={`w-[3px] shrink-0 ${c.bar}`} aria-hidden />
                        <span className="min-w-0 flex-1 px-1.5 py-1">
                          {/* Schmale Spalten (parallele Termine): Titel umbrechen statt abschneiden */}
                          <span
                            className={`block font-semibold ${lanes > 1 ? 'line-clamp-3 break-words hyphens-auto' : 'truncate'}`}
                          >
                            {event.title}
                          </span>
                          {h >= 38 && lanes < 3 && (
                            <span className="block truncate text-black/60 tabular-nums">
                              {timeOf(event.start)}–{timeOf(event.end)}
                              <span className="text-black/45"> · AT {timeOf(convertZone(event.start))}</span>
                            </span>
                          )}
                          {h >= 56 && place && <span className="block truncate text-black/60">{place.name}</span>}
                        </span>
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
      <p className="mt-1.5 px-4 text-[13px] text-grey">
        {scope === 'mine'
          ? 'Mein Kalender: Arbeitsblöcke, Mahlzeiten und Transfers für alle, Aktivitäten nur wo du eingetragen bist.'
          : 'Alle Termine. Linke Zeitspalte Teneriffa, rechte Österreich.'}
      </p>

      {dialog && <EventDialog event={dialog.event} draft={dialog.draft} onClose={() => setDialog(null)} />}
    </>
  )
}

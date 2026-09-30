import { useState } from 'react'
import {
  convertZone,
  dayOf,
  defaultDay,
  eventsOn,
  formatDay,
  formatDistance,
  minutesBetween,
  nowAndNext,
  retreatDays,
  timeOf,
} from '../lib/agenda'
import { useNow, useRetreat } from '../lib/retreat'
import type { RetreatEvent } from '../lib/types'
import { EventDialog } from '../components/EventDialog'
import { EventItem } from '../components/EventItem'
import { MapsLink, SectionTitle } from '../components/ui'

export function Today() {
  const { content, places } = useRetreat()
  const now = useNow()
  const { phase, current, next } = nowAndNext(content.events, now)
  const days = retreatDays(content.events)
  const [day, setDay] = useState(() => defaultDay(days, now))
  const [open, setOpen] = useState<RetreatEvent | null>(null)

  const placeOf = (e: RetreatEvent) => (e.place ? places.get(e.place) : undefined)

  return (
    <div className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-6">
      <div className="md:sticky md:top-4">
        <section className="rounded-xl bg-royal-blue p-4 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-royal-blue-25">
            Jetzt · {timeOf(now)} Teneriffa · {timeOf(convertZone(now))} Österreich
          </p>
          {phase === 'before' && next && (
            <p className="mt-1 text-lg font-semibold">Es geht los {formatDistance(minutesBetween(now, next.start))}</p>
          )}
          {phase === 'after' && <p className="mt-1 text-lg font-semibold">Retreat vorbei – danke fürs Dabeisein!</p>}
          {phase === 'during' && current.length === 0 && (
            <p className="mt-1 text-lg font-semibold">Gerade nichts geplant – Freizeit</p>
          )}
          {current.map(e => {
            const place = placeOf(e)
            return (
              <div key={e.id} className="mt-1">
                <p className="text-lg font-semibold">{e.title}</p>
                <p className="text-sm text-royal-blue-25">
                  bis {timeOf(e.end)}
                  {place && ` · ${place.name}`}
                </p>
              </div>
            )
          })}
        </section>

        {next && (
          <section className="mt-3 rounded-xl border-l-4 border-green bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-grey">
              Als Nächstes · {formatDistance(minutesBetween(now, next.start))}
            </p>
            <p className="mt-1 text-lg font-semibold">{next.title}</p>
            <p className="text-sm text-grey">
              {dayOf(next.start) !== dayOf(now) && `${formatDay(dayOf(next.start))} · `}
              {timeOf(next.start)}–{timeOf(next.end)}
            </p>
            {placeOf(next) && <MapsLink place={placeOf(next)!} className="mt-1 text-sm" />}
          </section>
        )}
      </div>

      <div>
        <SectionTitle>Programm</SectionTitle>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {days.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                d === day ? 'bg-royal-blue text-white' : 'bg-white text-black'
              } ${d === dayOf(now) && d !== day ? 'ring-2 ring-green' : ''}`}
            >
              {formatDay(d)}
            </button>
          ))}
        </div>
        <ol className="mt-2 space-y-2">
          {eventsOn(content.events, day).map(e => (
            <EventItem
              key={e.id}
              event={e}
              place={placeOf(e)}
              state={e.end <= now ? 'past' : e.start <= now ? 'now' : 'future'}
              onOpen={() => setOpen(e)}
            />
          ))}
        </ol>
        <p className="mt-3 text-xs text-grey">Zeiten in Teneriffa-Zeit, „AT“ = Österreich.</p>
      </div>

      {open && <EventDialog event={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

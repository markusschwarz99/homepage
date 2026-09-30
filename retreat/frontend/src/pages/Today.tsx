import { useState } from 'react'
import {
  convertZone,
  dayOf,
  defaultDay,
  eventsOn,
  formatDay,
  formatDistance,
  isMine,
  minutesBetween,
  nowAndNext,
  retreatDays,
  timeOf,
} from '../lib/agenda'
import { SCOPE_OPTIONS, useNow, useRetreat, useScope } from '../lib/retreat'
import type { RetreatEvent } from '../lib/types'
import { EventDialog } from '../components/EventDialog'
import { EventItem } from '../components/EventItem'
import { WeekStrip } from '../components/WeekStrip'
import { CATEGORY, Section, Segmented } from '../components/ui'

export function Today() {
  const { me, content, places } = useRetreat()
  const now = useNow()
  const [scope, setScope] = useScope()
  const events = scope === 'mine' ? content.events.filter(e => isMine(e, me.id)) : content.events
  const { phase, current, next } = nowAndNext(events, now)
  const days = retreatDays(content.events)
  const [day, setDay] = useState(() => defaultDay(days, now))
  const [open, setOpen] = useState<RetreatEvent | null>(null)
  const dayEvents = eventsOn(events, day)

  const placeOf = (e: RetreatEvent) => (e.place ? places.get(e.place) : undefined)

  return (
    <>
      <Segmented
        label="Kalender-Auswahl"
        value={scope}
        options={SCOPE_OPTIONS}
        onChange={setScope}
        className="mt-2 w-full md:w-auto"
      />

      <div className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-6">
        <div className="md:sticky md:top-20">
          {/* Jetzt – als Widget in der Hauptfarbe */}
          <section className="mt-4 rounded-[20px] bg-royal-blue p-4 text-white shadow-md">
            <div className="flex items-baseline justify-between text-[13px] font-semibold text-royal-blue-25">
              <span>JETZT</span>
              <span className="tabular-nums">
                {timeOf(now)} TFS · {timeOf(convertZone(now))} AT
              </span>
            </div>
            {phase === 'before' && next && (
              <p className="mt-2 text-[22px] leading-tight font-bold">
                Es geht los {formatDistance(minutesBetween(now, next.start))}
              </p>
            )}
            {phase === 'after' && (
              <p className="mt-2 text-[22px] leading-tight font-bold">Retreat vorbei – danke fürs Dabeisein!</p>
            )}
            {phase === 'during' && current.length === 0 && (
              <p className="mt-2 text-[22px] leading-tight font-bold">Gerade nichts geplant</p>
            )}
            {current.map(e => (
              <button key={e.id} type="button" onClick={() => setOpen(e)} className="mt-2 block w-full text-left">
                <p className="text-[22px] leading-tight font-bold">{e.title}</p>
                <p className="text-[15px] text-royal-blue-25">
                  bis {timeOf(e.end)}
                  {placeOf(e) && ` · ${placeOf(e)!.name}`}
                </p>
              </button>
            ))}
          </section>

          {next && (
            <button
              type="button"
              onClick={() => setOpen(next)}
              className="mt-3 flex w-full items-stretch gap-3 rounded-[20px] bg-white p-4 text-left active:bg-grey-25"
            >
              <span className={`w-1 shrink-0 rounded-full ${CATEGORY[next.category].bar}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between text-[13px] font-semibold text-grey">
                  <span>ALS NÄCHSTES</span>
                  <span>{formatDistance(minutesBetween(now, next.start))}</span>
                </span>
                <span className="mt-1 block text-[17px] font-semibold">{next.title}</span>
                <span className="block text-[15px] text-grey">
                  {dayOf(next.start) !== dayOf(now) && `${formatDay(dayOf(next.start))} · `}
                  {timeOf(next.start)}–{timeOf(next.end)}
                  {placeOf(next) && ` · ${placeOf(next)!.name}`}
                </span>
              </span>
            </button>
          )}
        </div>

        <div>
          <div className="mt-6 rounded-xl bg-white px-2 py-1 md:mt-4">
            <WeekStrip days={days} value={day} today={dayOf(now)} onChange={setDay} />
          </div>
          <Section title={formatDay(day)} footer="Zeiten in Teneriffa-Zeit, „AT“ = Österreich." className="mt-4!">
            {dayEvents.length === 0 && <p className="px-4 py-3 text-grey">Keine Termine.</p>}
            {dayEvents.map(e => (
              <EventItem
                key={e.id}
                event={e}
                place={placeOf(e)}
                state={e.end <= now ? 'past' : e.start <= now ? 'now' : 'future'}
                onOpen={() => setOpen(e)}
              />
            ))}
          </Section>
        </div>
      </div>

      {open && <EventDialog event={open} onClose={() => setOpen(null)} />}
    </>
  )
}

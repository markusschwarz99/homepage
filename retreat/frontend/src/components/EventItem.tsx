import { convertZone, timeOf } from '../lib/agenda'
import type { Place, RetreatEvent } from '../lib/types'
import { CATEGORY } from './ui'

/** Listenzeile eines Termins (Heute): Zeitspalte, Farbbalken, Titel, Ort. */
export function EventItem({
  event,
  place,
  state = 'future',
  onOpen,
}: {
  event: RetreatEvent
  place?: Place
  state?: 'past' | 'now' | 'future'
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex w-full pl-4 text-left active:bg-grey-25 ${state === 'past' ? 'opacity-50' : ''}`}
    >
      <div className="flex min-h-14 flex-1 items-stretch gap-3 border-b border-grey-25 py-2.5 pr-4 group-last:border-b-0">
        <div className="w-12 shrink-0 text-right leading-tight">
          <p className="text-[15px] font-semibold tabular-nums">{timeOf(event.start)}</p>
          <p className="text-[12px] text-grey tabular-nums">{timeOf(event.end)}</p>
          <p className="mt-0.5 text-[11px] text-grey-75 tabular-nums">AT {timeOf(convertZone(event.start))}</p>
        </div>
        <span className={`w-1 shrink-0 rounded-full ${CATEGORY[event.category].bar}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {event.title}
            {state === 'now' && (
              <span className="ml-2 rounded-full bg-royal-blue px-2 py-0.5 align-middle text-[11px] font-semibold text-white">
                JETZT
              </span>
            )}
          </p>
          {place && <p className="truncate text-[15px] text-grey">{place.name}</p>}
          {event.note && <p className="line-clamp-2 text-[13px] text-grey">{event.note}</p>}
        </div>
      </div>
    </button>
  )
}

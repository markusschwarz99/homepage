import { convertZone, timeOf } from '../lib/agenda'
import type { Place, RetreatEvent } from '../lib/types'
import { CATEGORY, CategoryChip } from './ui'

interface Props {
  event: RetreatEvent
  place?: Place
  state?: 'past' | 'now' | 'future'
  onOpen: () => void
}

export function EventItem({ event, place, state = 'future', onOpen }: Props) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`block w-full rounded-lg border-l-4 bg-white p-3 text-left hover:shadow-md ${
          CATEGORY[event.category].border
        } ${state === 'past' ? 'opacity-60' : ''} ${state === 'now' ? 'ring-2 ring-royal-blue' : ''}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm">
            <span className="font-mono">
              {timeOf(event.start)}–{timeOf(event.end)}
            </span>
            <span className="text-grey">
              {' '}
              · AT {timeOf(convertZone(event.start))}–{timeOf(convertZone(event.end))}
            </span>
          </span>
          <CategoryChip category={event.category} />
        </div>
        <p className="mt-1 font-semibold">{event.title}</p>
        {place && <p className="mt-0.5 text-sm text-accent-blue">{place.name}</p>}
        {event.note && <p className="mt-1 text-sm text-grey">{event.note}</p>}
      </button>
    </li>
  )
}

import { timeOf } from '../lib/agenda'
import type { Place, RetreatEvent } from '../lib/types'
import { CATEGORY, CategoryChip, MapsLink } from './ui'

interface Props {
  event: RetreatEvent
  place?: Place
  state?: 'past' | 'now' | 'future'
}

export function EventItem({ event, place, state = 'future' }: Props) {
  return (
    <li
      className={`rounded-lg border-l-4 bg-white p-3 ${CATEGORY[event.category].border} ${
        state === 'past' ? 'opacity-60' : ''
      } ${state === 'now' ? 'ring-2 ring-royal-blue' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm text-grey">
          {timeOf(event.start)}–{timeOf(event.end)}
        </span>
        <CategoryChip category={event.category} />
      </div>
      <p className="mt-1 font-semibold">{event.title}</p>
      {place && <MapsLink place={place} className="mt-1 text-sm" />}
      {event.note && <p className="mt-1 text-sm text-grey">{event.note}</p>}
    </li>
  )
}

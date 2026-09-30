import { Pencil } from 'lucide-react'
import { timeOf } from '../lib/agenda'
import { useRetreat } from '../lib/retreat'
import type { RetreatEvent } from '../lib/types'
import { ActivityInfo } from './ActivityInfo'
import { MapsLink } from './ui'

/** Listeneintrag einer Aktivität; die Daten kommen aus dem Kalender-Termin. */
export function ActivityItem({ event, onEdit }: { event: RetreatEvent; onEdit?: () => void }) {
  const { me, places } = useRetreat()
  const mine = event.participant_ids.includes(me.id) || event.coordinator_id === me.id
  const place = event.place ? places.get(event.place) : undefined

  return (
    <li className={`-mx-2 rounded-lg px-2 py-2 ${mine ? 'bg-accent-lightgreen-25' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold">{event.title}</span>
          <span className="ml-2 text-sm text-grey">
            {timeOf(event.start)}–{timeOf(event.end)}
          </span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${event.title} bearbeiten`}
            className="-m-1 p-1 text-grey"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {event.note && <p className="text-sm text-grey">{event.note}</p>}
      {place && <MapsLink place={place} className="text-sm" />}
      <div className="mt-1">
        <ActivityInfo event={event} />
      </div>
    </li>
  )
}

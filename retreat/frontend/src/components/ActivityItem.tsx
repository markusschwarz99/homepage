import { Map as MapIcon, Pencil, UserRound, Users } from 'lucide-react'
import { personName } from '../lib/people'
import { useRetreat } from '../lib/retreat'
import type { Activity } from '../lib/types'
import { WebLink } from './ui'

/** Eine Aktivität mit Koordination, Teilnehmenden und Links. */
export function ActivityItem({ activity, onEdit }: { activity: Activity; onEdit?: () => void }) {
  const { me, people } = useRetreat()
  const byId = new Map(people.map(p => [p.id, p]))
  const coordinator = activity.coordinator_id ? byId.get(activity.coordinator_id) : undefined
  const participants = activity.participant_ids.map(id => byId.get(id)).filter(p => p !== undefined)
  const everyone = participants.length === people.length
  const mine = activity.participant_ids.includes(me.id) || activity.coordinator_id === me.id

  return (
    <li className={`-mx-2 rounded-lg px-2 py-2 ${mine ? 'bg-accent-lightgreen-25' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{activity.title}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${activity.title} bearbeiten`}
            className="-m-1 p-1 text-grey"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {activity.details && <p className="text-sm text-grey">{activity.details}</p>}
      <p className="mt-1 flex items-center gap-1.5 text-sm">
        <UserRound size={15} className="shrink-0 text-grey" aria-hidden />
        <span>
          Koordination:{' '}
          {coordinator ? (
            <span className={coordinator.id === me.id ? 'font-semibold' : ''}>{personName(coordinator)}</span>
          ) : (
            <span className="text-grey">offen</span>
          )}
        </span>
      </p>
      <div className="mt-0.5 flex gap-1.5 text-sm">
        <Users size={15} className="mt-0.5 shrink-0 text-grey" aria-hidden />
        {participants.length === 0 ? (
          <span className="text-grey">Noch keine Teilnehmenden</span>
        ) : everyone ? (
          <span>Alle ({participants.length})</span>
        ) : (
          <details>
            <summary className="cursor-pointer">
              {participants.length} Teilnehmende
              {activity.participant_ids.includes(me.id) && ' – du bist dabei'}
            </summary>
            <p className="mt-1 text-grey">
              {participants.map((p, i) => (
                <span key={p.id} className={p.id === me.id ? 'font-semibold text-black' : ''}>
                  {i > 0 && ', '}
                  {personName(p)}
                </span>
              ))}
            </p>
          </details>
        )}
      </div>
      {(activity.maps_url || activity.url) && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {activity.maps_url && (
            <a
              href={activity.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              <MapIcon size={15} aria-hidden />
              Google Maps
            </a>
          )}
          {activity.url && <WebLink href={activity.url}>Details</WebLink>}
        </div>
      )}
    </li>
  )
}

import { Map as MapIcon, UserRound, Users } from 'lucide-react'
import { personName } from '../lib/people'
import { useRetreat } from '../lib/retreat'
import type { RetreatEvent } from '../lib/types'
import { WebLink } from './ui'

/** Koordination, Teilnehmende und Links eines Termins – nur was befüllt ist. */
export function ActivityInfo({
  event,
  expanded = false,
  className = '',
}: {
  event: RetreatEvent
  expanded?: boolean
  className?: string
}) {
  const { me, people } = useRetreat()
  const byId = new Map(people.map(p => [p.id, p]))
  const coordinator = event.coordinator_id ? byId.get(event.coordinator_id) : undefined
  const participants = event.participant_ids.map(id => byId.get(id)).filter(p => p !== undefined)
  const everyone = participants.length === people.length
  if (!coordinator && participants.length === 0 && !event.maps_url && !event.url) return null
  const names = (
    <p className="mt-1 text-grey">
      {participants.map((p, i) => (
        <span key={p.id} className={p.id === me.id ? 'font-semibold text-black' : ''}>
          {i > 0 && ', '}
          {personName(p)}
        </span>
      ))}
    </p>
  )

  return (
    <div className={`space-y-0.5 text-sm ${className}`}>
      {coordinator && (
        <p className="flex items-center gap-1.5">
          <UserRound size={15} className="shrink-0 text-grey" aria-hidden />
          <span>
            Koordination:{' '}
            <span className={coordinator.id === me.id ? 'font-semibold' : ''}>{personName(coordinator)}</span>
          </span>
        </p>
      )}
      {participants.length > 0 && (
        <div className="flex gap-1.5">
          <Users size={15} className="mt-0.5 shrink-0 text-grey" aria-hidden />
          {everyone ? (
            <span>Alle ({participants.length})</span>
          ) : expanded ? (
            <div>
              {participants.length} Teilnehmende
              {names}
            </div>
          ) : (
            <details>
              <summary className="cursor-pointer">
                {participants.length} Teilnehmende
                {event.participant_ids.includes(me.id) && ' – du bist dabei'}
              </summary>
              {names}
            </details>
          )}
        </div>
      )}
      {(event.maps_url || event.url) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
          {event.maps_url && (
            <a
              href={event.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              <MapIcon size={15} aria-hidden />
              Google Maps
            </a>
          )}
          {event.url && <WebLink href={event.url}>Details</WebLink>}
        </div>
      )}
    </div>
  )
}

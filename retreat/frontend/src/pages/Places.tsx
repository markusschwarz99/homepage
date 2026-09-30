import { useState } from 'react'
import { Plus } from 'lucide-react'
import { dayOf, defaultDay, formatDay, retreatDays, sortEvents, timeOf } from '../lib/agenda'
import { useNow, useRetreat } from '../lib/retreat'
import type { RetreatEvent } from '../lib/types'
import { ActivityItem } from '../components/ActivityItem'
import { EventDialog } from '../components/EventDialog'
import { PRIMARY_BUTTON } from '../components/Modal'
import { Card, MapsLink, PhoneLink, SectionTitle } from '../components/ui'

export function Places() {
  const { me, content } = useRetreat()
  const now = useNow()
  // Aktivitäten = Kalender-Termine der Kategorie "Aktivität" (keine eigene Pflege)
  const activities = sortEvents(content.events.filter(e => e.category === 'activity'))
  const activityDays = [...new Set(activities.map(a => dayOf(a.start)))].sort()
  // undefined = zu, null = neue Aktivität
  const [editing, setEditing] = useState<RetreatEvent | null | undefined>(undefined)
  const newDay = defaultDay(retreatDays(content.events), now)

  return (
    <>
      <div className="flex items-end justify-between gap-2">
        <SectionTitle>Aktivitäten</SectionTitle>
        {me.is_orga && (
          <button type="button" onClick={() => setEditing(null)} className={`${PRIMARY_BUTTON} mb-2 px-3`}>
            <Plus size={16} /> Aktivität
          </button>
        )}
      </div>
      {activityDays.length === 0 && <p className="text-sm text-grey">Noch keine Aktivitäten.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activityDays.map(day => (
          <Card key={day}>
            <h2 className="font-semibold text-royal-blue">{formatDay(day)}</h2>
            <ul className="mt-1 space-y-1">
              {activities
                .filter(a => dayOf(a.start) === day)
                .map(a => (
                  <ActivityItem key={a.id} event={a} onEdit={me.is_orga ? () => setEditing(a) : undefined} />
                ))}
            </ul>
          </Card>
        ))}
      </div>

      <SectionTitle>Restaurants &amp; Orte</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {content.places.map(place => {
          const visits = content.events.filter(e => e.place === place.id)
          return (
            <Card key={place.id}>
              <div className="flex items-baseline justify-between gap-2">
                <MapsLink place={place} className="text-base" />
                {place.distance && <span className="shrink-0 text-sm text-grey">{place.distance}</span>}
              </div>
              {place.address && <p className="text-sm text-grey">{place.address}</p>}
              {place.phone && (
                <p className="mt-1 text-sm">
                  <PhoneLink phone={place.phone} />
                </p>
              )}
              {visits.length > 0 && (
                <ul className="mt-2 text-sm">
                  {visits.map(e => (
                    <li key={e.id}>
                      {formatDay(dayOf(e.start))} {timeOf(e.start)} · {e.title}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>

      {editing !== undefined && (
        <EventDialog
          event={editing}
          startEditing
          draft={{ category: 'activity', start: `${newDay}T15:00`, end: `${newDay}T17:00` }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  )
}

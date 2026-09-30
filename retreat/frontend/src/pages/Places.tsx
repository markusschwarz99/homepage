import { useState } from 'react'
import { Plus } from 'lucide-react'
import { dayOf, formatDay, timeOf } from '../lib/agenda'
import { useRetreat } from '../lib/retreat'
import type { Activity } from '../lib/types'
import { ActivityDialog } from '../components/ActivityDialog'
import { ActivityItem } from '../components/ActivityItem'
import { PRIMARY_BUTTON } from '../components/Modal'
import { Card, MapsLink, PhoneLink, SectionTitle } from '../components/ui'

export function Places() {
  const { me, content, activities } = useRetreat()
  const activityDays = [...new Set(activities.map(a => a.day))].sort()
  // undefined = zu, null = neue Aktivität
  const [editing, setEditing] = useState<Activity | null | undefined>(undefined)

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
                .filter(a => a.day === day)
                .map(a => (
                  <ActivityItem key={a.id} activity={a} onEdit={me.is_orga ? () => setEditing(a) : undefined} />
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

      {editing !== undefined && <ActivityDialog activity={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

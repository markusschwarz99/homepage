import { dayOf, formatDay, timeOf } from '../lib/agenda'
import { useRetreat } from '../lib/retreat'
import { Card, MapsLink, PhoneLink, SectionTitle, WebLink } from '../components/ui'

export function Places() {
  const { content, places } = useRetreat()
  const activityDays = [...new Set(content.activities.map(a => a.day))].sort()

  return (
    <>
      {activityDays.length > 0 && <SectionTitle>Aktivitäten</SectionTitle>}
      <div className="space-y-3">
        {activityDays.map(day => (
          <Card key={day}>
            <h2 className="font-semibold text-royal-blue">{formatDay(day)}</h2>
            <ul className="mt-1 divide-y divide-grey-25">
              {content.activities
                .filter(a => a.day === day)
                .map(a => {
                  const place = a.place ? places.get(a.place) : undefined
                  return (
                    <li key={a.title} className="py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{a.title}</span>
                        {a.participants && (
                          <span className="shrink-0 text-sm text-grey">
                            {/^\d+$/.test(a.participants) ? `${a.participants} Pers.` : a.participants}
                          </span>
                        )}
                      </div>
                      {a.details && <p className="text-sm text-grey">{a.details}</p>}
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {place && <MapsLink place={place} />}
                        {a.url && <WebLink href={a.url}>Details</WebLink>}
                      </div>
                    </li>
                  )
                })}
            </ul>
          </Card>
        ))}
      </div>

      <SectionTitle>Restaurants &amp; Orte</SectionTitle>
      <div className="space-y-3">
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
                    <li key={e.start + e.title}>
                      {formatDay(dayOf(e.start))} {timeOf(e.start)} · {e.title}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

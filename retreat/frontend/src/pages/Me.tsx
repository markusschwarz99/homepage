import { dayOf, formatDay, sortEvents } from '../lib/agenda'
import { useRetreat } from '../lib/retreat'
import { byRole, firstName, personName, ROLE_LABEL } from '../lib/people'
import { ActivityItem } from '../components/ActivityItem'
import type { Person } from '../lib/types'
import { Card, MapsLink, SectionTitle } from '../components/ui'

export function Me() {
  const { me, people, cars, apartments, content, places } = useRetreat()
  const myActivities = sortEvents(
    content.events.filter(
      // alle Kategorien: überall, wo ich koordiniere oder eingetragen bin
      e => e.participant_ids.includes(me.id) || e.coordinator_id === me.id,
    ),
  )
  const car = cars.find(c => c.id === me.car_id)
  const apartment = apartments.find(a => a.id === me.apartment_id)
  const carPeople = people.filter(p => car && p.car_id === car.id).sort(byRole)
  const roommates = people.filter(p => apartment && p.apartment_id === apartment.id && p.id !== me.id)
  const accommodation = content.info.accommodation ? places.get(content.info.accommodation) : undefined

  return (
    <>
      <h2 className="text-2xl font-bold">Hallo {firstName(me)}!</h2>
      {me.is_orga && (
        <p className="text-sm text-grey">
          Du bist in der Orga und kannst Autos, Apartments, Termine und Aktivitäten bearbeiten.
        </p>
      )}

      <div className="md:grid md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <div>
          <SectionTitle>Mein Apartment</SectionTitle>
          <Card highlight={!!apartment}>
            {apartment ? (
              <>
                <p className="text-lg font-semibold">
                  {apartment.number && `${apartment.number} `}
                  {apartment.name}
                </p>
                {apartment.rooms_label && <p className="text-sm text-grey">{apartment.rooms_label}</p>}
                <p className="mt-2">
                  {roommates.length ? `Mit ${roommates.map(personName).join(', ')}` : 'Du wohnst allein.'}
                </p>
                {accommodation && (
                  <div className="mt-2 text-sm">
                    <MapsLink place={accommodation} />
                    {accommodation.address && <p className="text-grey">{accommodation.address}</p>}
                  </div>
                )}
              </>
            ) : (
              <p>Noch kein Apartment zugeteilt.</p>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle>Mein Auto</SectionTitle>
          <Card highlight={!!car}>
            {car ? (
              <>
                <p className="text-lg font-semibold">{car.name}</p>
                {car.kind === 'car' && me.car_role && (
                  <p className="text-sm text-grey">Du: {ROLE_LABEL[me.car_role]}</p>
                )}
                <ul className="mt-2 space-y-1">
                  {carPeople.map(p => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className={p.id === me.id ? 'font-semibold' : ''}>{personName(p)}</span>
                      {car.kind === 'car' && p.car_role && p.car_role !== 'passenger' && (
                        <span className="text-sm text-grey">{ROLE_LABEL[p.car_role]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Noch keinem Auto zugeteilt.</p>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle>Wo ich dabei bin</SectionTitle>
          <Card>
            {myActivities.length ? (
              <div className="space-y-2">
                {myActivities.map(a => (
                  <div key={a.id}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-royal-blue">
                      {formatDay(dayOf(a.start))}
                    </p>
                    <ul>
                      <ActivityItem event={a} />
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p>Du bist noch bei keinem Programmpunkt eingetragen.</p>
            )}
          </Card>
        </div>

        {(content.info.core_hours || content.info.note) && (
          <div>
            <SectionTitle>Gut zu wissen</SectionTitle>
            <Card>
              {content.info.core_hours && <p>Kernzeit: {content.info.core_hours}</p>}
              {content.info.note && <p className="text-sm text-grey">{content.info.note}</p>}
            </Card>
          </div>
        )}
      </div>

      {me.is_orga && <OrgaAdmin />}
    </>
  )
}

/** Orga-Rechte vergeben/entziehen (nur für Orga sichtbar). */
function OrgaAdmin() {
  const { me, people, update } = useRetreat()
  const sorted = [...people].sort((a, b) => personName(a).localeCompare(personName(b), 'de'))
  const orgaCount = people.filter(p => p.is_orga).length

  const toggle = (p: Person) => {
    if (p.id === me.id && p.is_orga && !window.confirm('Du entziehst dir damit selbst die Orga-Rechte. Fortfahren?')) {
      return
    }
    update(p.id, { is_orga: !p.is_orga })
  }

  return (
    <>
      <SectionTitle>Orga verwalten</SectionTitle>
      <Card>
        <p className="text-sm text-grey">
          Orga-Mitglieder können Autos, Apartments, Termine und Aktivitäten bearbeiten und selbst Orga-Rechte vergeben.
          Mindestens eine Person muss in der Orga bleiben.
        </p>
        <ul className="mt-3 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(p => (
            <li key={p.id}>
              <label className="flex items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-royal-blue"
                  checked={p.is_orga}
                  disabled={p.is_orga && orgaCount === 1}
                  onChange={() => toggle(p)}
                />
                <span className={p.is_orga ? 'font-semibold' : ''}>
                  {personName(p)}
                  {p.id === me.id && ' (du)'}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

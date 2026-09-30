import { useRetreat } from '../lib/retreat'
import { byRole, firstName, personName, ROLE_LABEL } from '../lib/people'
import { Card, MapsLink, SectionTitle } from '../components/ui'

export function Me() {
  const { me, people, cars, apartments, content, places } = useRetreat()
  const car = cars.find(c => c.id === me.car_id)
  const apartment = apartments.find(a => a.id === me.apartment_id)
  const carPeople = people.filter(p => car && p.car_id === car.id).sort(byRole)
  const roommates = people.filter(p => apartment && p.apartment_id === apartment.id && p.id !== me.id)
  const accommodation = content.info.accommodation ? places.get(content.info.accommodation) : undefined

  return (
    <>
      <h2 className="text-2xl font-bold">Hallo {firstName(me)}!</h2>
      {me.is_orga && <p className="text-sm text-grey">Du bist in der Orga und kannst Autos und Apartments zuteilen.</p>}

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
    </>
  )
}

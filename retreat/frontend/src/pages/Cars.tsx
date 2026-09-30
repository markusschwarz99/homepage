import { useRetreat } from '../lib/retreat'
import { byRole, personName, ROLE_LABEL } from '../lib/people'
import type { Car, CarRole, Person } from '../lib/types'
import { Card, SectionTitle, Select } from '../components/ui'

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as CarRole[]).map(r => ({ value: r, label: ROLE_LABEL[r] }))

export function Cars() {
  const { me, people, cars } = useRetreat()
  const unassigned = people.filter(p => p.car_id === null)

  return (
    <>
      {me.is_orga && <p className="mb-3 text-sm text-grey">Orga: Personen per Auswahl in ein anderes Auto setzen.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cars.map(car => {
          const members = people.filter(p => p.car_id === car.id).sort(byRole)
          const hasDriver = members.some(p => p.car_role === 'driver')
          return (
            <Card key={car.id} highlight={car.id === me.car_id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{car.name}</h2>
                <span className="text-sm text-grey">
                  {car.kind === 'taxi'
                    ? `${members.length} ${members.length === 1 ? 'Person' : 'Personen'}`
                    : `${members.length}/${car.seats} Plätze`}
                </span>
              </div>
              {car.kind === 'car' && !hasDriver && <p className="text-sm font-semibold">⚠ Keine Fahrer:in</p>}
              <ul className="mt-2 divide-y divide-grey-25">
                {members.map(p => (
                  <CarPersonRow key={p.id} person={p} car={car} />
                ))}
                {members.length === 0 && <li className="py-1.5 text-sm text-grey">Niemand</li>}
              </ul>
            </Card>
          )
        })}
      </div>

      {unassigned.length > 0 && (
        <>
          <SectionTitle>Nicht zugeteilt</SectionTitle>
          <Card>
            <ul className="divide-y divide-grey-25">
              {unassigned.map(p => (
                <CarPersonRow key={p.id} person={p} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}

function CarPersonRow({ person, car }: { person: Person; car?: Car }) {
  const { me, cars, update } = useRetreat()
  const showRole = car?.kind === 'car' && person.car_role

  return (
    <li className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={person.id === me.id ? 'font-semibold' : ''}>{personName(person)}</span>
        {!me.is_orga && showRole && person.car_role !== 'passenger' && (
          <span className="text-sm text-grey">{ROLE_LABEL[person.car_role!]}</span>
        )}
      </div>
      {me.is_orga && (
        <div className="mt-1 flex flex-wrap gap-2">
          <Select
            label={`Auto für ${personName(person)}`}
            value={person.car_id}
            emptyLabel="– kein Auto –"
            options={cars.map(c => ({ value: c.id, label: c.name }))}
            onChange={v => update(person.id, { car_id: v })}
          />
          {showRole && (
            <Select
              label={`Rolle von ${personName(person)}`}
              value={person.car_role}
              options={ROLE_OPTIONS}
              onChange={v => v && update(person.id, { car_role: v })}
            />
          )}
        </div>
      )}
    </li>
  )
}

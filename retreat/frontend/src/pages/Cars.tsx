import { useRetreat } from '../lib/retreat'
import { byRole, personName, ROLE_LABEL } from '../lib/people'
import type { Car, CarRole, Person } from '../lib/types'
import { Row, Section, Select } from '../components/ui'

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as CarRole[]).map(r => ({ value: r, label: ROLE_LABEL[r] }))

export function Cars() {
  const { me, people, cars } = useRetreat()
  const unassigned = people.filter(p => p.car_id === null)

  return (
    <>
      {me.is_orga && <p className="px-1 text-[15px] text-grey">Tippe auf Auto oder Rolle, um umzusetzen.</p>}
      <div className="md:grid md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
        {cars.map(car => {
          const members = people.filter(p => p.car_id === car.id).sort(byRole)
          const hasDriver = members.some(p => p.car_role === 'driver')
          const count =
            car.kind === 'taxi'
              ? `${members.length} ${members.length === 1 ? 'Person' : 'Personen'}`
              : `${members.length}/${car.seats} Plätze`
          return (
            <Section
              key={car.id}
              title={car.name}
              action={<span className="text-[13px] text-grey">{count}</span>}
              footer={car.kind === 'car' && !hasDriver ? '⚠︎ Keine Fahrer:in' : undefined}
            >
              {members.map(p => (
                <CarPersonRow key={p.id} person={p} car={car} />
              ))}
              {members.length === 0 && <Row className="text-grey">Niemand</Row>}
            </Section>
          )
        })}
        {unassigned.length > 0 && (
          <Section title="Nicht zugeteilt">
            {unassigned.map(p => (
              <CarPersonRow key={p.id} person={p} />
            ))}
          </Section>
        )}
      </div>
    </>
  )
}

function CarPersonRow({ person, car }: { person: Person; car?: Car }) {
  const { me, cars, update } = useRetreat()
  const showRole = car?.kind === 'car' && person.car_role
  const mine = car && car.id === me.car_id

  return (
    <Row highlight={!!mine && person.id === me.id}>
      {/* Bei Platzmangel (mobil, Orga) rutschen die Auswahlfelder in eine zweite Zeile */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className={`min-w-0 truncate ${person.id === me.id ? 'font-semibold' : ''}`}>{personName(person)}</span>
        {me.is_orga ? (
          <span className="ml-auto flex items-center gap-4">
            {showRole && (
              <Select
                label={`Rolle von ${personName(person)}`}
                value={person.car_role}
                options={ROLE_OPTIONS}
                onChange={v => v && update(person.id, { car_role: v })}
              />
            )}
            <Select
              label={`Auto für ${personName(person)}`}
              value={person.car_id}
              emptyLabel="Kein Auto"
              options={cars.map(c => ({ value: c.id, label: c.name }))}
              onChange={v => update(person.id, { car_id: v })}
            />
          </span>
        ) : (
          showRole &&
          person.car_role !== 'passenger' && <span className="text-grey">{ROLE_LABEL[person.car_role!]}</span>
        )}
      </div>
    </Row>
  )
}

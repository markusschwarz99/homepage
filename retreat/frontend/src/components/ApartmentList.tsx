import { useRetreat } from '../lib/retreat'
import { personName } from '../lib/people'
import type { Person } from '../lib/types'
import { Row, Section, Select } from '../components/ui'

/** Zimmerverteilung; `editable` = Orga kann umziehen lassen. */
export function ApartmentList({ editable = false }: { editable?: boolean }) {
  const { people, apartments } = useRetreat()
  const unassigned = people.filter(p => p.apartment_id === null)

  return (
    <>
      {editable && <p className="px-1 text-[15px] text-grey">Tippe auf das Apartment, um umzuziehen.</p>}
      <div className="md:grid md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
        {apartments.map(apt => {
          const members = people.filter(p => p.apartment_id === apt.id)
          const over = members.length > apt.capacity
          return (
            <Section
              key={apt.id}
              title={[apt.number, apt.name].filter(Boolean).join(' · ')}
              action={
                <span className={`text-[13px] ${over ? 'font-semibold text-black' : 'text-grey'}`}>
                  {over && '⚠︎ '}
                  {members.length}/{apt.capacity} Plätze
                </span>
              }
              footer={apt.rooms_label}
            >
              {members.map(p => (
                <ApartmentPersonRow key={p.id} person={p} editable={editable} />
              ))}
              {members.length === 0 && <Row className="text-grey">Frei</Row>}
            </Section>
          )
        })}
        {unassigned.length > 0 && (
          <Section title="Nicht zugeteilt">
            {unassigned.map(p => (
              <ApartmentPersonRow key={p.id} person={p} editable={editable} />
            ))}
          </Section>
        )}
      </div>
    </>
  )
}

function ApartmentPersonRow({ person, editable }: { person: Person; editable: boolean }) {
  const { me, apartments, update } = useRetreat()

  return (
    <Row highlight={person.id === me.id}>
      <div className="flex items-center justify-between gap-3">
        <span className={`min-w-0 truncate ${person.id === me.id ? 'font-semibold' : ''}`}>{personName(person)}</span>
        {editable && (
          <Select
            label={`Apartment für ${personName(person)}`}
            value={person.apartment_id}
            emptyLabel="Keins"
            options={apartments.map(a => ({ value: a.id, label: [a.number, a.name].filter(Boolean).join(' ') }))}
            onChange={v => update(person.id, { apartment_id: v })}
          />
        )}
      </div>
    </Row>
  )
}

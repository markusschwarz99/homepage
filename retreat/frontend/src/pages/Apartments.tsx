import { useRetreat } from '../lib/retreat'
import { personName } from '../lib/people'
import type { Person } from '../lib/types'
import { Card, SectionTitle, Select } from '../components/ui'

export function Apartments() {
  const { me, people, apartments } = useRetreat()
  const unassigned = people.filter(p => p.apartment_id === null)

  return (
    <>
      {me.is_orga && (
        <p className="mb-3 text-sm text-grey">Orga: Personen per Auswahl in ein anderes Apartment verschieben.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apartments.map(apt => {
          const members = people.filter(p => p.apartment_id === apt.id)
          return (
            <Card key={apt.id} highlight={apt.id === me.apartment_id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {apt.number && `${apt.number} `}
                  {apt.name}
                </h2>
                <span className={`text-sm ${members.length > apt.capacity ? 'font-semibold' : 'text-grey'}`}>
                  {members.length > apt.capacity && '⚠ '}
                  {members.length}/{apt.capacity} Plätze
                </span>
              </div>
              {apt.rooms_label && <p className="text-sm text-grey">{apt.rooms_label}</p>}
              <ul className="mt-2 divide-y divide-grey-25">
                {members.map(p => (
                  <ApartmentPersonRow key={p.id} person={p} />
                ))}
                {members.length === 0 && <li className="py-1.5 text-sm text-grey">Frei</li>}
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
                <ApartmentPersonRow key={p.id} person={p} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}

function ApartmentPersonRow({ person }: { person: Person }) {
  const { me, apartments, update } = useRetreat()

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className={person.id === me.id ? 'font-semibold' : ''}>{personName(person)}</span>
      {me.is_orga && (
        <Select
          label={`Apartment für ${personName(person)}`}
          value={person.apartment_id}
          emptyLabel="– kein Apartment –"
          options={apartments.map(a => ({ value: a.id, label: [a.number, a.name].filter(Boolean).join(' ') }))}
          onChange={v => update(person.id, { apartment_id: v })}
        />
      )}
    </li>
  )
}

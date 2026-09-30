import { useRetreat } from '../lib/retreat'
import { byRole, firstName, personName, ROLE_LABEL } from '../lib/people'
import type { Person } from '../lib/types'
import { MapsLink, Row, Section, Switch, ValueRow } from '../components/ui'

export function Me() {
  const { me, people, cars, apartments, content, places } = useRetreat()
  const car = cars.find(c => c.id === me.car_id)
  const apartment = apartments.find(a => a.id === me.apartment_id)
  const carPeople = people.filter(p => car && p.car_id === car.id).sort(byRole)
  const roommates = people.filter(p => apartment && p.apartment_id === apartment.id && p.id !== me.id)
  const accommodation = content.info.accommodation ? places.get(content.info.accommodation) : undefined

  return (
    <>
      <p className="px-1 text-[20px] font-semibold">Hallo {firstName(me)}!</p>
      {me.is_orga && (
        <p className="px-1 text-[15px] text-grey">
          Du bist in der Orga und kannst Autos, Apartments und den Kalender bearbeiten.
        </p>
      )}

      <div className="md:grid md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
        <Section title="Mein Apartment">
          {apartment ? (
            <>
              <ValueRow
                label={
                  <span className="font-semibold">{[apartment.number, apartment.name].filter(Boolean).join(' ')}</span>
                }
              >
                {apartment.rooms_label}
              </ValueRow>
              {roommates.length === 0 && <Row>Du wohnst allein.</Row>}
              {roommates.map(p => (
                <Row key={p.id}>{personName(p)}</Row>
              ))}
              {accommodation && (
                <Row>
                  <MapsLink place={accommodation} />
                  {accommodation.address && <p className="text-[13px] text-grey">{accommodation.address}</p>}
                </Row>
              )}
            </>
          ) : (
            <Row>Noch kein Apartment zugeteilt.</Row>
          )}
        </Section>

        <Section title="Mein Auto">
          {car ? (
            <>
              <ValueRow label={<span className="font-semibold">{car.name}</span>}>
                {car.kind === 'car' && me.car_role ? `Du: ${ROLE_LABEL[me.car_role]}` : ''}
              </ValueRow>
              {carPeople
                .filter(p => p.id !== me.id)
                .map(p => (
                  <ValueRow key={p.id} label={personName(p)}>
                    {car.kind === 'car' && p.car_role && p.car_role !== 'passenger' ? ROLE_LABEL[p.car_role] : ''}
                  </ValueRow>
                ))}
            </>
          ) : (
            <Row>Noch keinem Auto zugeteilt.</Row>
          )}
        </Section>

        {(content.info.core_hours || content.info.note) && (
          <Section title="Gut zu wissen" footer={content.info.note}>
            {content.info.core_hours && <ValueRow label="Kernzeit">{content.info.core_hours}</ValueRow>}
          </Section>
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
    <Section
      title="Orga verwalten"
      footer="Orga-Mitglieder können Autos, Apartments und den Kalender bearbeiten und selbst Orga-Rechte vergeben. Mindestens eine Person muss in der Orga bleiben."
    >
      <div className="md:grid md:grid-cols-2 xl:grid-cols-3">
        {sorted.map(p => (
          <Row key={p.id}>
            <div className="flex items-center justify-between gap-3">
              <span className={p.is_orga ? 'font-semibold' : ''}>
                {personName(p)}
                {p.id === me.id && ' (du)'}
              </span>
              <Switch
                label={`Orga-Rechte für ${personName(p)}`}
                checked={p.is_orga}
                disabled={p.is_orga && orgaCount === 1}
                onChange={() => toggle(p)}
              />
            </div>
          </Row>
        ))}
      </div>
    </Section>
  )
}

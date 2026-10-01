import { useRetreat } from '../lib/retreat'
import { byRole, firstName, personName, ROLE_LABEL } from '../lib/people'
import { MapsLink, Row, Section, ValueRow } from '../components/ui'

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
          Du bist in der Orga. Autos, Zimmer und Orga-Rechte verwaltest du unter Einstellungen.
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
    </>
  )
}

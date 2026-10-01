import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useRetreat } from '../lib/retreat'
import { personName } from '../lib/people'
import type { Person } from '../lib/types'
import { ApartmentList } from '../components/ApartmentList'
import { CarList } from '../components/CarList'
import { Row, Section, Segmented, Switch } from '../components/ui'

type View = 'cars' | 'apartments' | 'orga'

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'cars', label: 'Autos' },
  { value: 'apartments', label: 'Zimmer' },
  { value: 'orga', label: 'Orga' },
]

/** Alle Orga-Einstellungen: Auto-/Zimmerzuteilung und Orga-Rechte. */
export function Settings() {
  const { me } = useRetreat()
  const [view, setView] = useState<View>('cars')

  if (!me.is_orga) return <Navigate to="/info" replace />

  return (
    <>
      <Segmented label="Bereich" value={view} options={VIEW_OPTIONS} onChange={setView} className="mt-2 w-full md:w-auto" />
      {view === 'cars' && <CarList editable />}
      {view === 'apartments' && <ApartmentList editable />}
      {view === 'orga' && <OrgaAdmin />}
    </>
  )
}

/** Orga-Rechte vergeben/entziehen. */
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
      footer="Orga-Mitglieder sehen die Einstellungen, können Autos, Zimmer und den Kalender bearbeiten und selbst Orga-Rechte vergeben. Mindestens eine Person muss in der Orga bleiben."
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

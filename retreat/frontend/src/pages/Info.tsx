import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useRetreat } from '../lib/retreat'
import { ApartmentList } from '../components/ApartmentList'
import { CarList } from '../components/CarList'
import { Segmented } from '../components/ui'

type View = 'cars' | 'apartments'

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'cars', label: 'Autos' },
  { value: 'apartments', label: 'Zimmer' },
]

/** Autos und Zimmerverteilung zum Nachschauen (Orga bearbeitet das unter Einstellungen). */
export function Info() {
  const { me } = useRetreat()
  const [view, setView] = useState<View>('cars')

  if (me.is_orga) return <Navigate to="/einstellungen" replace />

  return (
    <>
      <Segmented label="Ansicht" value={view} options={VIEW_OPTIONS} onChange={setView} className="mt-2 w-full md:w-auto" />
      {view === 'cars' ? <CarList /> : <ApartmentList />}
    </>
  )
}

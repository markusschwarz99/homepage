import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useRetreatContext } from './lib/retreat'
import { Apartments } from './pages/Apartments'
import { Calendar } from './pages/Calendar'
import { Cars } from './pages/Cars'
import { Me } from './pages/Me'
import { Today } from './pages/Today'

function Screen({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-[18px] bg-royal-blue shadow-lg" aria-hidden>
          <img src="/favicon.svg" alt="" className="h-16 w-16 rounded-[18px]" />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-grey">{text}</p>
      </div>
    </div>
  )
}

export default function App() {
  const { status, error } = useRetreatContext()

  if (status === 'no-access')
    return (
      <Screen
        title="Teamretreat 2026"
        text="Bitte öffne die App über deinen persönlichen Link. Den bekommst du von der Orga."
      />
    )
  if (status === 'error') return <Screen title="Ups" text={error ?? 'Die Daten konnten nicht geladen werden.'} />
  if (status === 'loading') return <Screen title="Teamretreat 2026" text="Lädt …" />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="kalender" element={<Calendar />} />
          <Route path="ich" element={<Me />} />
          <Route path="autos" element={<Cars />} />
          <Route path="apartments" element={<Apartments />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

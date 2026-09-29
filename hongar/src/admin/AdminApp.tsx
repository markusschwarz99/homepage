import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import LoginScreen from '../components/LoginScreen'
import Logo from '../components/Logo'
import { isEditor, useAuth } from '../lib/auth'
import PageEditor from './PageEditor'
import PageList from './PageList'
import SettingsEditor from './SettingsEditor'

export default function AdminApp() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  if (!isEditor(user)) return <LoginScreen />

  const onSettings = pathname.startsWith('/admin/allgemein')
  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 font-semibold ${active ? 'bg-alm-forest text-white' : 'hover:bg-alm-sand'}`

  return (
    <div className="min-h-screen bg-alm-cream">
      <header className="border-b border-alm-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">Verwaltung</span>
          </Link>
          <nav className="flex gap-1" aria-label="Verwaltung">
            <Link to="/admin" className={tab(!onSettings)}>
              Seiten
            </Link>
            <Link to="/admin/allgemein" className={tab(onSettings)}>
              Allgemeines
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link to="/" className="font-semibold text-alm-wood hover:underline">
              Zur Website
            </Link>
            <button type="button" onClick={logout} className="hover:underline">
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route index element={<PageList />} />
          <Route path="seiten/neu" element={<PageEditor key="neu" />} />
          <Route path="seiten/:id" element={<EditRoute />} />
          <Route path="allgemein" element={<SettingsEditor />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// key erzwingt einen frischen Editor pro Seite (z.B. direkt nach dem Anlegen).
function EditRoute() {
  const { id } = useParams()
  return <PageEditor key={id} pageId={Number(id)} />
}

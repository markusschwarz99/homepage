import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LoginScreen from './components/LoginScreen'
import { ErrorScreen, Splash } from './components/Screens'
import { api } from './lib/api'
import { AuthProvider, isEditor, useAuth } from './lib/auth'
import { SiteProvider } from './lib/site'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import PageView from './pages/PageView'
import Webcam from './pages/Webcam'

// Verwaltung (inkl. TipTap-Editor) nur bei Bedarf nachladen.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}

// Testphase (HONGAR_PUBLIC=false): ohne Redaktions-Login nur die Login-Maske.
function Gate() {
  const { user, loading } = useAuth()
  const [config, setConfig] = useState<{ public: boolean } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api<{ public: boolean }>('/hongar/config')
      .then(setConfig)
      .catch(() => setFailed(true))
  }, [])

  if (failed) return <ErrorScreen />
  if (!config || loading) return <Splash />
  if (!config.public && !isEditor(user)) return <LoginScreen testMode />

  return (
    <SiteProvider key={user?.id ?? 'anon'} isPublic={config.public}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Splash />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="webcam" element={<Webcam />} />
          <Route path=":slug" element={<PageView />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SiteProvider>
  )
}

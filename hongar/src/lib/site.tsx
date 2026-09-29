import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { NavPage, SiteSettings } from './types'

interface SiteContextValue {
  isPublic: boolean
  pages: NavPage[]
  settings: SiteSettings
  loaded: boolean
  reload: () => void
}

const EMPTY_SETTINGS: SiteSettings = {
  opening_hours: '',
  news: '',
  contact: '',
  facebook_url: '',
  booking_url: '',
  webcam_urls: '',
}

const SiteContext = createContext<SiteContextValue | null>(null)

// Menü + globale Texte, einmal geladen und von Header/Footer/Seiten geteilt.
export function SiteProvider({ isPublic, children }: { isPublic: boolean; children: ReactNode }) {
  const [pages, setPages] = useState<NavPage[]>([])
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([api<NavPage[]>('/hongar/pages'), api<SiteSettings>('/hongar/settings')])
      .then(([p, s]) => {
        if (cancelled) return
        setPages(p)
        setSettings(s)
      })
      .catch(() => {
        // Menü bleibt leer; die einzelnen Seiten zeigen ihre eigenen Fehler.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const reload = useCallback(() => setVersion(v => v + 1), [])

  const value = useMemo(
    () => ({ isPublic, pages, settings, loaded, reload }),
    [isPublic, pages, settings, loaded, reload],
  )
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite() braucht einen SiteProvider')
  return ctx
}

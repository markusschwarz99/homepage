import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { SiteContent } from './content'
import type { SiteSettings } from './types'

interface SiteContextValue {
  isPublic: boolean
  content: SiteContent
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

// Seiteninhalte + globale Texte, einmal geladen und von Header/Footer/Seiten geteilt.
export function SiteProvider({ isPublic, children }: { isPublic: boolean; children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>({ pages: [] })
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([api<SiteContent>('/hongar/content'), api<SiteSettings>('/hongar/settings')])
      .then(([c, s]) => {
        if (cancelled) return
        setContent(c)
        setSettings(s)
      })
      .catch(() => {
        // Menü bleibt leer, Seiten zeigen dann "nicht gefunden".
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
    () => ({ isPublic, content, settings, loaded, reload }),
    [isPublic, content, settings, loaded, reload],
  )
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite() braucht einen SiteProvider')
  return ctx
}

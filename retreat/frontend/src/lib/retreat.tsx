import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, clearToken, getToken } from './api'
import { currentNow } from './agenda'
import type { Place, PersonUpdate, RetreatState } from './types'

export type Status = 'loading' | 'ready' | 'no-access' | 'error'

interface RetreatContextValue {
  status: Status
  error: string | null
  state: RetreatState | null
  update: (personId: number, patch: PersonUpdate) => Promise<void>
  message: string | null
  dismissMessage: () => void
}

const RetreatContext = createContext<RetreatContextValue | null>(null)

const REFRESH_MS = 60_000

export function RetreatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RetreatState | null>(null)
  const [status, setStatus] = useState<Status>(getToken() ? 'loading' : 'no-access')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const loaded = useRef(false)

  const load = useCallback(async () => {
    if (!getToken()) return
    try {
      setState(await api<RetreatState>('/state'))
      loaded.current = true
      setStatus('ready')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearToken()
        setStatus('no-access')
      } else if (!loaded.current) {
        // Nach dem ersten Laden bleiben die alten Daten stehen (z.B. offline).
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const update = useCallback(
    async (personId: number, patch: PersonUpdate) => {
      try {
        await api(`/people/${personId}`, { method: 'PATCH', body: JSON.stringify(patch) })
        setMessage(null)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e))
      }
      await load()
    },
    [load],
  )

  return (
    <RetreatContext.Provider
      value={{ status, error, state, update, message, dismissMessage: () => setMessage(null) }}
    >
      {children}
    </RetreatContext.Provider>
  )
}

export function useRetreatContext(): RetreatContextValue {
  const ctx = useContext(RetreatContext)
  if (!ctx) throw new Error('useRetreatContext außerhalb von RetreatProvider')
  return ctx
}

/** Für Seiten, die erst nach dem Laden gerendert werden. */
export function useRetreat() {
  const { state, update } = useRetreatContext()
  if (!state) throw new Error('Daten noch nicht geladen')
  const places = new Map<string, Place>(state.content.places.map(p => [p.id, p]))
  return { ...state, places, update }
}

/** Aktuelle Teneriffa-Zeit, aktualisiert alle 30 s. */
export function useNow(): string {
  const [now, setNow] = useState(currentNow)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(currentNow()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

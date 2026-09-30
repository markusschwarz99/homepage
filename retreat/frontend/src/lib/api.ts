const TOKEN_KEY = 'retreat_token'
// Fallback, falls localStorage nicht verfügbar ist (privater Modus o.ä.).
let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

function setToken(token: string) {
  memoryToken = token
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // gilt dann nur bis zum Neuladen
  }
}

export function clearToken() {
  memoryToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nichts zu tun
  }
}

/** Persönlichen Link (?k=<token>) übernehmen und aus der URL entfernen. */
export function initTokenFromUrl() {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('k')
  if (!token) return
  setToken(token)
  url.searchParams.delete('k')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function detailText(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = data.detail
    if (typeof detail === 'string') return detail
    // FastAPI-Validierungsfehler: Liste von {loc, msg}
    if (Array.isArray(detail) && detail.length) {
      return detail.map(d => String(d?.msg ?? '').replace(/^Value error, /, '')).join(', ')
    }
  }
  return `Fehler ${status}`
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken() ?? ''}`,
    },
  })
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, detailText(data, res.status))
  }
  return data as T
}

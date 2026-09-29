import { API_URL } from '../config'
import { prepareImage } from './image'

const TOKEN_KEY = 'hongar_token'
// Fallback, falls localStorage nicht verfügbar ist (privater Modus o.ä.).
let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token: string) {
  memoryToken = token
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Login gilt dann nur bis zum Neuladen.
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

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function detailText(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const text = detail
        .map(d => String(d?.msg ?? '').replace(/^Value error, /, ''))
        .filter(Boolean)
        .join(', ')
      if (text) return text
    }
  }
  if (status === 413) return 'Datei zu groß'
  return `Fehler ${status}`
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Keine Verbindung zum Server')
  }

  if (res.status === 401 && token) {
    clearToken()
    unauthorizedHandler?.()
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // keine JSON-Antwort
  }
  if (!res.ok) throw new ApiError(res.status, detailText(data, res.status))
  return data as T
}

// Multipart-Upload: Content-Type setzt der Browser selbst (Boundary).
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', await prepareImage(file))
  return api<T>(path, { method: 'POST', body: form })
}

export function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Unbekannter Fehler'
}

// Die API liefert Upload-Pfade relativ ("/uploads/…").
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`
}

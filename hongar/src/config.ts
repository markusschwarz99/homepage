// Name der Website (Header, Browser-Tab, Fußzeile).
export const SITE_NAME = 'Almgasthof Schwarz'

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''

// Hauptseite: dort liegen die Konten ("Passwort vergessen").
export const MAIN_SITE_URL = 'https://markus-schwarz.cc'

// Die CMS-Seite mit diesem Kürzel ist die Startseite.
export const START_SLUG = 'start'

// Lage des Almgasthofs (Ziel der Wanderrouten) – Markierung auf den GPX-Karten.
export const HONGAR_LATLNG: [number, number] = [47.92141, 13.68516]

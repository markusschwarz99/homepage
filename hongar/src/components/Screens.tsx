import { SITE_NAME } from '../config'
import Logo from './Logo'

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true" aria-label="Wird geladen">
      <Logo className="h-14 w-14 animate-pulse" />
    </div>
  )
}

export function ErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="h-14 w-14" />
      <h1 className="font-display text-2xl font-semibold">{SITE_NAME}</h1>
      <p className="max-w-sm text-alm-muted">
        Die Seite ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten noch einmal.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-alm-forest px-4 py-2 font-semibold text-white hover:bg-alm-forest-dark"
      >
        Neu laden
      </button>
    </div>
  )
}

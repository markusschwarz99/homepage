import { useState } from 'react'
import type { FormEvent } from 'react'
import { MAIN_SITE_URL, SITE_NAME } from '../config'
import { errorText } from '../lib/api'
import { isEditor, useAuth } from '../lib/auth'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Logo from './Logo'

const input =
  'mt-1 w-full rounded-lg border border-alm-line bg-white px-3 py-2.5 text-base focus:border-alm-forest focus:outline-none focus:ring-2 focus:ring-alm-forest/20'

export default function LoginScreen({ testMode = false }: { testMode?: boolean }) {
  const { user, login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useDocumentTitle('Anmelden')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-alm-forest px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-alm-cream p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-14 w-14" />
          <h1 className="mt-4 font-display text-2xl font-semibold">{SITE_NAME}</h1>
          {testMode && (
            <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Diese Website ist noch in der Testphase und nur nach Anmeldung sichtbar.
            </p>
          )}
        </div>

        {user && !isEditor(user) ? (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-alm-muted">
              Du bist als <strong>{user.name}</strong> angemeldet, aber dieses Konto ist für diese Seite nicht
              freigeschaltet.
            </p>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-lg border border-alm-line bg-white px-4 py-2.5 font-semibold hover:bg-alm-sand"
            >
              Abmelden
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              E-Mail
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold">
              Passwort
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={input}
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-alm-forest px-4 py-2.5 font-semibold text-white hover:bg-alm-forest-dark disabled:opacity-60"
            >
              {busy ? 'Anmelden …' : 'Anmelden'}
            </button>
            <p className="text-center text-sm">
              <a
                href={`${MAIN_SITE_URL}/forgot-password`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-alm-wood underline-offset-2 hover:underline"
              >
                Passwort vergessen?
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

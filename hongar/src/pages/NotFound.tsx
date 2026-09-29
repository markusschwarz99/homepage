import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Seite nicht gefunden')
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold text-alm-wood">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">Diese Seite gibt es nicht</h1>
      <p className="mt-3 text-alm-muted">Vielleicht hat sich die Adresse geändert.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-alm-forest px-4 py-2 font-semibold text-white hover:bg-alm-forest-dark"
      >
        Zur Startseite
      </Link>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { SITE_NAME } from '../config'
import { isEditor, useAuth } from '../lib/auth'
import { buildNav } from '../lib/nav'
import { useSite } from '../lib/site'
import { webcamUrls } from '../lib/webcam'
import Logo from './Logo'
import RichText from './RichText'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <EditorBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// Nur für die Redaktion sichtbar: Hinweis auf Testphase + Weg in die Verwaltung.
function EditorBar() {
  const { user, logout } = useAuth()
  const { isPublic } = useSite()
  if (!isEditor(user)) return null
  return (
    <div className="bg-alm-stone text-sm text-alm-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <span>
          Angemeldet als <strong>{user?.name}</strong>
        </span>
        {!isPublic && (
          <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200">
            Testphase – nur für Angemeldete sichtbar
          </span>
        )}
        <span className="ml-auto flex gap-4">
          <Link to="/admin" className="underline-offset-4 hover:underline">
            Verwaltung
          </Link>
          <button type="button" onClick={logout} className="underline-offset-4 hover:underline">
            Abmelden
          </button>
        </span>
      </div>
    </div>
  )
}

const linkBase = 'rounded-lg px-3 py-2 font-semibold transition-colors'
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${isActive ? 'text-alm-forest bg-alm-sand/70' : 'text-alm-stone hover:text-alm-forest hover:bg-alm-sand/50'}`

function Header() {
  const { pages, settings } = useSite()
  const [open, setOpen] = useState(false)
  const nav = useMemo(
    () => buildNav(pages, webcamUrls(settings.webcam_urls).length > 0),
    [pages, settings.webcam_urls],
  )
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-alm-line bg-alm-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" onClick={close} className="flex items-center gap-3">
          <Logo />
          <span className="font-display text-xl font-semibold leading-tight">{SITE_NAME}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Hauptmenü">
          {nav.map(entry => (
            <div key={entry.key} className="group relative">
              <NavLink to={entry.to} className={linkClass}>
                {entry.title}
                {entry.children.length > 0 && <span aria-hidden="true" className="ml-1 text-xs">▾</span>}
              </NavLink>
              {entry.children.length > 0 && (
                <div className="invisible absolute left-0 top-full min-w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl border border-alm-line bg-white p-2 shadow-lg">
                    {entry.children.map(child => (
                      <NavLink
                        key={child.key}
                        to={child.to}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2 ${isActive ? 'bg-alm-sand text-alm-forest' : 'hover:bg-alm-sand/60'}`
                        }
                      >
                        {child.title}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="ml-auto rounded-lg px-3 py-2 font-semibold hover:bg-alm-sand lg:hidden"
        >
          {open ? 'Schließen' : 'Menü'}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Hauptmenü" className="border-t border-alm-line bg-alm-cream lg:hidden">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-4 sm:px-6">
            <li>
              <NavLink to="/" end onClick={close} className={args => `${linkClass(args)} block`}>
                Start
              </NavLink>
            </li>
            {nav.map(entry => (
              <li key={entry.key}>
                <NavLink to={entry.to} onClick={close} className={args => `${linkClass(args)} block`}>
                  {entry.title}
                </NavLink>
                {entry.children.length > 0 && (
                  <ul className="ml-4 border-l border-alm-line pl-2">
                    {entry.children.map(child => (
                      <li key={child.key}>
                        <NavLink
                          to={child.to}
                          onClick={close}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-2 ${isActive ? 'text-alm-forest font-semibold' : 'text-alm-muted hover:text-alm-forest'}`
                          }
                        >
                          {child.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  const { pages, settings } = useSite()
  const has = (slug: string) => pages.some(p => p.slug === slug)
  const hasWebcam = webcamUrls(settings.webcam_urls).length > 0
  const links = [
    settings.booking_url && { label: 'Ferienhaus buchen', href: settings.booking_url },
    settings.facebook_url && { label: 'Facebook', href: settings.facebook_url },
  ].filter((l): l is { label: string; href: string } => !!l)

  return (
    <footer className="mt-24 bg-alm-forest text-alm-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="font-display text-xl font-semibold">{SITE_NAME}</span>
          </div>
          {settings.contact && <RichText html={settings.contact} tone="dark" className="prose-sm mt-4" />}
        </div>
        <div id="oeffnungszeiten">
          <h2 className="font-display text-lg font-semibold">Öffnungszeiten</h2>
          {settings.opening_hours ? (
            <RichText html={settings.opening_hours} tone="dark" className="prose-sm mt-3" />
          ) : (
            <p className="mt-3 text-sm text-alm-cream/70">Bitte telefonisch nachfragen.</p>
          )}
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Mehr</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {hasWebcam && (
              <li>
                <Link to="/webcam" className="hover:underline">
                  Webcam
                </Link>
              </li>
            )}
            {links.map(link => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-xs text-alm-cream/70 sm:px-6">
          <span>
            © {new Date().getFullYear()} {SITE_NAME}
          </span>
          <span className="ml-auto flex gap-4">
            {has('impressum') && (
              <Link to="/impressum" className="hover:underline">
                Impressum
              </Link>
            )}
            {has('datenschutz') && (
              <Link to="/datenschutz" className="hover:underline">
                Datenschutz
              </Link>
            )}
          </span>
        </div>
      </div>
    </footer>
  )
}

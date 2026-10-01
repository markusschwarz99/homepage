import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarClock, CalendarDays, Info, Settings, UserRound, X } from 'lucide-react'
import { keepTokenInUrl } from '../lib/api'
import { useRetreat, useRetreatContext } from '../lib/retreat'

const TABS = [
  { to: '/', label: 'Heute', icon: CalendarClock },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/ich', label: 'Ich', icon: UserRound },
  // Orga bekommt Einstellungen (bearbeitbar), alle anderen Info (nur lesen)
  { to: '/info', label: 'Info', icon: Info, orga: false },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings, orga: true },
]

export function Layout() {
  const { me, content } = useRetreat()
  const { message, dismissMessage } = useRetreatContext()
  const { pathname, search } = useLocation()
  const tabs = TABS.filter(t => t.orga === undefined || t.orga === me.is_orga)
  const current = tabs.find(t => t.to === pathname) ?? tabs[0]

  // Token nach jedem Tab-Wechsel wieder in die URL (für „Zum Home-Bildschirm“)
  useEffect(keepTokenInUrl, [pathname, search])

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-12">
      {/* Durchscheinende Navigationsleiste wie in iOS */}
      <header className="sticky top-0 z-30 border-b border-grey-25/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-center px-4 md:h-14 md:justify-between md:px-6">
          <p className="truncate text-[15px] font-semibold">
            {content.info.title}
            <span className="font-normal text-grey"> · {content.info.location}</span>
          </p>
          <nav className="hidden md:block" aria-label="Hauptnavigation">
            <ul className="flex gap-1 rounded-[10px] bg-grey-25/70 p-0.5">
              {tabs.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                        isActive ? 'bg-white text-royal-blue shadow-sm' : 'text-black/70 hover:text-black'
                      }`
                    }
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 md:max-w-6xl md:px-6">
        <h1 className="pt-4 pb-1 text-[34px] leading-tight font-bold tracking-tight">{current.label}</h1>
        {message && (
          <div role="alert" className="mt-2 flex items-start justify-between gap-2 rounded-xl bg-white p-3 text-[15px]">
            <span>⚠︎ {message}</span>
            <button type="button" onClick={dismissMessage} aria-label="Hinweis schließen" className="text-grey">
              <X size={18} />
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Tab-Leiste (nur mobil) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-grey-25/80 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
        aria-label="Hauptnavigation"
      >
        <ul className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 pt-1.5 pb-1 text-[10px] font-medium ${
                    isActive ? 'text-royal-blue' : 'text-grey-75'
                  }`
                }
              >
                <Icon size={24} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

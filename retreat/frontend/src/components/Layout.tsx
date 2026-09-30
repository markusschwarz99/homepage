import { NavLink, Outlet } from 'react-router-dom'
import { BedDouble, CalendarClock, CalendarDays, Car, MapPinned, UserRound, X } from 'lucide-react'
import { useRetreat, useRetreatContext } from '../lib/retreat'

// short: Label in der mobilen Bottom-Nav (6 Tabs auf ~360 px)
const TABS = [
  { to: '/', label: 'Heute', short: 'Heute', icon: CalendarClock },
  { to: '/kalender', label: 'Kalender', short: 'Kalender', icon: CalendarDays },
  { to: '/ich', label: 'Ich', short: 'Ich', icon: UserRound },
  { to: '/autos', label: 'Autos', short: 'Autos', icon: Car },
  { to: '/apartments', label: 'Apartments', short: 'Wohnen', icon: BedDouble },
  { to: '/orte', label: 'Orte', short: 'Orte', icon: MapPinned },
]

export function Layout() {
  const { content } = useRetreat()
  const { message, dismissMessage } = useRetreatContext()

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="bg-royal-blue px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-4 text-white md:px-6 md:pb-0">
        <div className="mx-auto flex max-w-xl flex-col md:max-w-6xl">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">{content.info.title}</h1>
            <p className="text-sm text-royal-blue-25">{content.info.location}</p>
          </div>
          <nav className="mt-3 hidden md:block" aria-label="Hauptnavigation">
            <ul className="flex gap-1">
              {TABS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold ${
                        isActive ? 'bg-grey-25 text-royal-blue' : 'text-white hover:bg-royal-blue-75'
                      }`
                    }
                  >
                    <Icon size={18} aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4 md:max-w-6xl md:px-6 md:pt-6">
        {message && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-2 rounded-lg border-l-4 border-black bg-white p-3 text-sm"
          >
            <span>{message}</span>
            <button type="button" onClick={dismissMessage} aria-label="Hinweis schließen">
              <X size={18} />
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-grey-25 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ to, short, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                    isActive ? 'font-semibold text-royal-blue' : 'text-grey'
                  }`
                }
              >
                <Icon size={22} aria-hidden />
                {short}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

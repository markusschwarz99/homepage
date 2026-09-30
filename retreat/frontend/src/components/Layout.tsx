import { NavLink, Outlet } from 'react-router-dom'
import { BedDouble, CalendarClock, Car, MapPinned, UserRound, X } from 'lucide-react'
import { useRetreat, useRetreatContext } from '../lib/retreat'

const TABS = [
  { to: '/', label: 'Heute', icon: CalendarClock },
  { to: '/ich', label: 'Ich', icon: UserRound },
  { to: '/autos', label: 'Autos', icon: Car },
  { to: '/apartments', label: 'Apartments', icon: BedDouble },
  { to: '/orte', label: 'Orte', icon: MapPinned },
]

export function Layout() {
  const { content } = useRetreat()
  const { message, dismissMessage } = useRetreatContext()

  return (
    <div className="min-h-dvh pb-24">
      <header className="bg-royal-blue px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-4 text-white">
        <div className="mx-auto max-w-xl">
          <h1 className="text-xl font-bold">{content.info.title}</h1>
          <p className="text-sm text-royal-blue-25">{content.info.location}</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4">
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

      <nav className="fixed inset-x-0 bottom-0 border-t border-grey-25 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-xs ${
                    isActive ? 'font-semibold text-royal-blue' : 'text-grey'
                  }`
                }
              >
                <Icon size={22} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

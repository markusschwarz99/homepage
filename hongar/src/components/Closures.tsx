import { CalendarOff } from 'lucide-react'
import { bannerClosure, formatLong, formatRange, isCurrent, reopenDate, todayIso } from '../lib/closures'
import { useSite } from '../lib/site'

// Hinweisleiste unter dem Menü: laufender oder bald beginnender Betriebsurlaub.
export function ClosureBanner() {
  const { closures } = useSite()
  const closure = bannerClosure(closures)
  if (!closure) return null
  const current = isCurrent(closure)
  return (
    <aside aria-label="Betriebsurlaub" className="bg-alm-wood text-white">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3 sm:px-6">
        <CalendarOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-alm-sand" />
        <p>
          {current ? (
            <>
              <strong>Betriebsurlaub – wir haben derzeit geschlossen.</strong> Ab {formatLong(reopenDate(closure))} sind
              wir wieder für dich da.
            </>
          ) : (
            <>
              <strong>Betriebsurlaub: {formatRange(closure)}.</strong> In dieser Zeit haben wir geschlossen.
            </>
          )}
          {closure.note && <span className="block text-sm text-white/85">{closure.note}</span>}
        </p>
      </div>
    </aside>
  )
}

// Alle kommenden Betriebsurlaube, bei den Öffnungszeiten.
export function ClosureList({ tone = 'light', className = '' }: { tone?: 'light' | 'dark'; className?: string }) {
  const { closures } = useSite()
  const today = todayIso()
  const shown = closures.filter(c => c.end_date >= today)
  if (shown.length === 0) return null
  return (
    <div
      className={`rounded-xl p-4 ${tone === 'dark' ? 'bg-white/10 text-alm-cream' : 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'} ${className}`}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <CalendarOff aria-hidden="true" className="h-4 w-4" />
        Betriebsurlaub
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {shown.map(c => (
          <li key={c.id}>
            <strong>{formatRange(c)}</strong>
            {isCurrent(c, today) && ' – derzeit geschlossen'}
            {c.note && <span className="block opacity-80">{c.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

import { formatDay } from '../lib/agenda'

/** Tagesauswahl wie im iOS-Kalender: Wochentag klein, Datum im Kreis. */
export function WeekStrip({
  days,
  value,
  today,
  onChange,
  className = '',
}: {
  days: string[]
  value: string
  today: string
  onChange: (day: string) => void
  className?: string
}) {
  return (
    <div
      className={`grid gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map(d => {
        const selected = d === value
        const [weekday, date] = formatDay(d).split(' ')
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={selected}
            aria-label={formatDay(d)}
            className="flex flex-col items-center gap-1 py-1"
          >
            <span className="text-[11px] font-medium text-grey uppercase">{weekday}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[17px] ${
                selected
                  ? 'bg-royal-blue font-semibold text-white'
                  : d === today
                    ? 'font-semibold text-royal-blue'
                    : 'text-black'
              }`}
            >
              {Number(date.slice(0, 2))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

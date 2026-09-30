import type { ReactNode } from 'react'
import { Check, ChevronRight, ExternalLink, Map as MapIcon, MapPin, Phone } from 'lucide-react'
import { mapsUrl } from '../lib/people'
import type { Category, Place } from '../lib/types'

// --- iOS-Bausteine in der Retreat-Palette ------------------------------------

/** Gruppierte Liste (inset grouped) mit optionaler Kopf- und Fußzeile. */
export function Section({
  title,
  action,
  footer,
  children,
  className = '',
}: {
  title?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`mt-6 ${className}`}>
      {(title || action) && (
        <div className="mb-1.5 flex items-end justify-between gap-2 px-4">
          {title && <h2 className="text-[13px] uppercase tracking-wide text-grey">{title}</h2>}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-xl bg-white">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[13px] text-grey">{footer}</p>}
    </section>
  )
}

/** Zeile mit eingerückter Trennlinie (wie UITableView). */
export function Row({
  children,
  highlight = false,
  onClick,
  chevron = false,
  className = '',
}: {
  children: ReactNode
  highlight?: boolean
  onClick?: () => void
  chevron?: boolean
  className?: string
}) {
  const inner = (
    <div className="flex min-h-11 flex-1 items-center gap-3 border-b border-grey-25 py-2.5 pr-4 group-last:border-b-0">
      <div className="min-w-0 flex-1">{children}</div>
      {chevron && <ChevronRight size={18} className="shrink-0 text-grey-50" aria-hidden />}
    </div>
  )
  const cls = `group flex w-full pl-4 text-left ${highlight ? 'bg-accent-lightgreen-25' : ''} ${className}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-grey-25`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

/** Zeile „Label ……… Wert“. */
export function ValueRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Row>
      <div className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="text-right text-grey">{children}</span>
      </div>
    </Row>
  )
}

/** iOS Segmented Control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-[9px] bg-grey-25 p-0.5 ${className}`}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[7px] px-3 py-1 text-[13px] font-semibold whitespace-nowrap transition ${
            o.value === value ? 'bg-white text-black shadow-sm' : 'text-black/70'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** iOS-Schalter (grün = an, wie in iOS). */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-green' : 'bg-grey-25'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

/** Auswahlzeile mit Häkchen (Mehrfachauswahl wie in iOS-Listen). */
export function CheckRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="group flex w-full pl-4 text-left active:bg-grey-25"
    >
      <div className="flex min-h-11 flex-1 items-center justify-between gap-3 border-b border-grey-25 py-2.5 pr-4 group-last:border-b-0">
        <span>{children}</span>
        {checked && <Check size={20} className="shrink-0 text-royal-blue" aria-hidden />}
      </div>
    </button>
  )
}

// --- Kategorien -----------------------------------------------------------------

// bar: Farbbalken, tint: Fläche (Kalender/Chip)
export const CATEGORY: Record<Category, { label: string; bar: string; tint: string }> = {
  meal: { label: 'Mahlzeit', bar: 'bg-green', tint: 'bg-green-25' },
  work: { label: 'Arbeitsblock', bar: 'bg-royal-blue', tint: 'bg-royal-blue-25' },
  activity: { label: 'Aktivität', bar: 'bg-accent-lightgreen', tint: 'bg-accent-lightgreen-25' },
  travel: { label: 'Transfer', bar: 'bg-grey', tint: 'bg-grey-25' },
}

export function CategoryChip({ category }: { category: Category }) {
  const c = CATEGORY[category]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.tint}`}>
      <span className={`h-2 w-2 rounded-full ${c.bar}`} aria-hidden />
      {c.label}
    </span>
  )
}

// --- Links ------------------------------------------------------------------------

const LINK = 'inline-flex items-center gap-1.5 text-accent-blue active:opacity-60'

export function MapsLink({ place, className = '' }: { place: Place; className?: string }) {
  return (
    <a href={mapsUrl(place)} target="_blank" rel="noopener noreferrer" className={`${LINK} ${className}`}>
      <MapPin size={16} aria-hidden />
      {place.name}
    </a>
  )
}

export function MapsUrlLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      <MapIcon size={16} aria-hidden />
      In Google Maps öffnen
    </a>
  )
}

export function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone.replace(/\s+/g, '')}`} className={LINK}>
      <Phone size={16} aria-hidden />
      {phone}
    </a>
  )
}

export function WebLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      <ExternalLink size={16} aria-hidden />
      {children}
    </a>
  )
}

/** Natives Select im iOS-„Pop-up-Button“-Stil (Wert in Akzentfarbe, rechtsbündig). */
export function Select<T extends string | number>({
  label,
  value,
  options,
  emptyLabel,
  disabled,
  onChange,
}: {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  emptyLabel?: string
  disabled?: boolean
  onChange: (value: T | null) => void
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={e => {
        const opt = options.find(o => String(o.value) === e.target.value)
        onChange(opt ? opt.value : null)
      }}
      className="max-w-[11rem] cursor-pointer truncate bg-transparent text-right text-[15px] text-royal-blue disabled:opacity-50"
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

import type { ReactNode } from 'react'
import { ExternalLink, MapPin, Phone } from 'lucide-react'
import { mapsUrl } from '../lib/people'
import type { Category, Place } from '../lib/types'

/** highlight: eigenes Auto/Apartment (Hellgrün nur als Fläche, Text schwarz) */
export function Card({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <section className={`rounded-xl p-4 shadow-sm ${highlight ? 'bg-accent-lightgreen-25' : 'bg-white'}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-grey">{children}</h2>
}

// border: Kartenrand in der Timeline, chip: Kategorie-Label
export const CATEGORY: Record<Category, { label: string; border: string; chip: string }> = {
  meal: { label: 'Mahlzeit', border: 'border-green', chip: 'bg-green-25 border-green' },
  work: { label: 'Arbeitsblock', border: 'border-royal-blue', chip: 'bg-royal-blue-25 border-royal-blue' },
  activity: {
    label: 'Aktivität',
    border: 'border-accent-lightgreen',
    chip: 'bg-accent-lightgreen-25 border-accent-lightgreen',
  },
  travel: { label: 'Transfer', border: 'border-grey', chip: 'bg-grey-25 border-grey' },
}

export function CategoryChip({ category }: { category: Category }) {
  const c = CATEGORY[category]
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${c.chip}`}>
      {c.label}
    </span>
  )
}

export function MapsLink({ place, className = '' }: { place: Place; className?: string }) {
  return (
    <a
      href={mapsUrl(place)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 font-medium text-accent-blue underline-offset-2 hover:underline ${className}`}
    >
      <MapPin size={15} aria-hidden />
      {place.name}
    </a>
  )
}

export function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, '')}`}
      className="inline-flex items-center gap-1 text-accent-blue underline-offset-2 hover:underline"
    >
      <Phone size={15} aria-hidden />
      {phone}
    </a>
  )
}

export function WebLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent-blue underline-offset-2 hover:underline"
    >
      <ExternalLink size={15} aria-hidden />
      {children}
    </a>
  )
}

interface SelectProps<T extends string | number> {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  emptyLabel?: string
  disabled?: boolean
  onChange: (value: T | null) => void
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  emptyLabel,
  disabled,
  onChange,
}: SelectProps<T>) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={e => {
        const raw = e.target.value
        const opt = options.find(o => String(o.value) === raw)
        onChange(opt ? opt.value : null)
      }}
      className="rounded-lg border border-grey-50 bg-white px-2 py-1 text-sm disabled:opacity-50"
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

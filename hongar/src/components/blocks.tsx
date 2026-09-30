import {
  ArrowRight,
  CalendarPlus,
  Check,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  MoveDown,
  MoveUp,
  Pencil,
  Quote,
  Route,
} from 'lucide-react'
import { Fragment, lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, assetUrl } from '../lib/api'
import { isEditor, useAuth } from '../lib/auth'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar'
import type { Block, ContentPage, Img, LinkItem } from '../lib/content'
import { IMAGE_CREDITS } from '../lib/credits'
import { childPages } from '../lib/nav'
import { useSite } from '../lib/site'
import type { HongarEvent } from '../lib/types'
import { webcamUrls, withCacheBuster } from '../lib/webcam'
import { ClosureList } from './Closures'
import Gallery from './Gallery'
import Icon from './Icon'
import RichText from './RichText'
import TeaserGrid from './TeaserGrid'

const GpxMap = lazy(() => import('./GpxMap'))

// ---------- kleine Helfer ----------

// "**fett**" im Fließtext
function Inline({ text, strongClassName = 'text-alm-stone' }: { text: string; strongClassName?: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={`font-semibold ${strongClassName}`}>
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function Paragraphs({ text, className = '' }: { text?: string[]; className?: string }) {
  if (!text?.length) return null
  return (
    <div className={`space-y-4 text-lg leading-relaxed text-alm-stone/85 ${className}`}>
      {text.map((p, i) => (
        <p key={i}>
          <Inline text={p} />
        </p>
      ))}
    </div>
  )
}

const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//')

export function SmartLink({ link, className, children }: { link: LinkItem; className: string; children?: ReactNode }) {
  const content = children ?? link.label
  if (isInternal(link.href)) {
    return (
      <Link to={link.href} className={className}>
        {content}
      </Link>
    )
  }
  const external = /^https?:/.test(link.href)
  return (
    <a
      href={link.href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {content}
    </a>
  )
}

const btnPrimary =
  'inline-flex items-center gap-2 rounded-full bg-alm-forest px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-alm-forest-dark'
const textLink = 'inline-flex items-center gap-1.5 font-semibold text-alm-wood hover:underline underline-offset-4'

function LinkButton({ link, variant = 'button' }: { link: LinkItem; variant?: 'button' | 'text' }) {
  const external = /^https?:/.test(link.href)
  return (
    <SmartLink link={link} className={variant === 'button' ? btnPrimary : textLink}>
      {link.label}
      {external ? (
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
      ) : (
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      )}
    </SmartLink>
  )
}

function Heading({
  eyebrow,
  title,
  lead,
  center = false,
}: {
  eyebrow?: string
  title?: string
  lead?: string
  center?: boolean
}) {
  if (!eyebrow && !title && !lead) return null
  return (
    <div className={`mb-8 ${center ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl'}`}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-alm-wood">{eyebrow}</p>
      )}
      {title && <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>}
      {lead && <p className="mt-4 text-lg leading-relaxed text-alm-muted md:text-xl">{lead}</p>}
    </div>
  )
}

function Picture({ image, className = '' }: { image: Img; className?: string }) {
  return (
    <figure className={className}>
      <img
        src={assetUrl(image.src)}
        alt={image.alt}
        loading="lazy"
        className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md ring-1 ring-black/5"
      />
      {image.caption && <figcaption className="mt-2 text-sm text-alm-muted">{image.caption}</figcaption>}
    </figure>
  )
}

function CheckList({ items, tone = 'light' }: { items: string[]; tone?: 'light' | 'warning' }) {
  return (
    <ul className="space-y-2.5">
      {items.map(item => (
        <li key={item} className="flex gap-3">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone === 'warning' ? 'bg-amber-200/70 text-amber-900' : 'bg-alm-meadow/15 text-alm-meadow'}`}
          >
            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="leading-relaxed">
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function IconBadge({ name, className = '' }: { name?: string; className?: string }) {
  return (
    <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-alm-sand text-alm-wood ${className}`}>
      <Icon name={name} />
    </span>
  )
}

// ---------- Bausteine ----------

function TextBlock({ block }: { block: Extract<Block, { type: 'text' }> }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
      <Paragraphs text={block.text} />
      {block.link && (
        <div className="mt-6">
          <LinkButton link={block.link} variant="text" />
        </div>
      )}
    </div>
  )
}

function SplitBlock({ block }: { block: Extract<Block, { type: 'split' }> }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <Picture image={block.image} className={block.reverse ? 'md:order-last' : ''} />
      <div>
        <Heading eyebrow={block.eyebrow} title={block.title} />
        <Paragraphs text={block.text} />
        {block.items && (
          <div className="mt-6">
            <CheckList items={block.items} />
          </div>
        )}
        {block.link && (
          <div className="mt-8">
            <LinkButton link={block.link} variant="text" />
          </div>
        )}
      </div>
    </div>
  )
}

function StatsBlock({ block }: { block: Extract<Block, { type: 'stats' }> }) {
  return (
    <div className="rounded-3xl bg-alm-forest px-6 py-10 text-alm-cream shadow-lg md:px-12">
      {block.title && <h2 className="mb-8 text-center font-display text-2xl font-semibold">{block.title}</h2>}
      <dl className={`grid gap-8 text-center sm:grid-cols-2 ${block.items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {block.items.map(item => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            {item.icon && <Icon name={item.icon} className="h-7 w-7 text-alm-sand" />}
            <dt className="order-last text-sm uppercase tracking-wider text-alm-cream/75">{item.label}</dt>
            <dd className="font-display text-4xl font-semibold md:text-5xl">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FeaturesBlock({ block }: { block: Extract<Block, { type: 'features' }> }) {
  const cols = block.items.length % 3 === 0 || block.items.length > 4 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
      <div className={`grid gap-5 sm:grid-cols-2 ${cols}`}>
        {block.items.map(item => (
          <div key={item.title} className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-alm-line">
            <IconBadge name={item.icon} />
            <div>
              <h3 className="font-display text-xl font-semibold">{item.title}</h3>
              {item.text && (
                <p className="mt-1.5 leading-relaxed text-alm-muted">
                  <Inline text={item.text} />
                </p>
              )}
              {item.link && (
                <div className="mt-3">
                  <LinkButton link={item.link} variant="text" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListsBlock({ block }: { block: Extract<Block, { type: 'lists' }> }) {
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
      <div className={`grid gap-6 ${block.columns.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-2xl'}`}>
        {block.columns.map((col, i) => (
          <div key={col.title ?? i} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-alm-line md:p-8">
            {col.title && (
              <h3 className="mb-5 flex items-center gap-3 font-display text-2xl font-semibold">
                <IconBadge name={col.icon} className="h-11 w-11" />
                {col.title}
              </h3>
            )}
            <CheckList items={col.items} />
          </div>
        ))}
      </div>
      {block.note && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-alm-muted">
          <Inline text={block.note} />
        </p>
      )}
    </div>
  )
}

function NoticeBlock({ block }: { block: Extract<Block, { type: 'notice' }> }) {
  const warning = block.tone === 'warning'
  return (
    <div
      className={`mx-auto max-w-4xl rounded-3xl p-6 ring-1 md:p-10 ${warning ? 'bg-amber-50 ring-amber-200' : 'bg-alm-sand/70 ring-alm-line'}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${warning ? 'bg-amber-200/70 text-amber-900' : 'bg-white text-alm-wood'}`}
        >
          <Icon name={block.icon ?? (warning ? 'alert' : 'info')} />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold">{block.title}</h2>
          <Paragraphs text={block.text} className="mt-3 text-base!" />
          {block.items && (
            <div className="mt-5">
              <CheckList items={block.items} tone={warning ? 'warning' : 'light'} />
            </div>
          )}
          {block.footer && (
            <p className="mt-6 font-semibold">
              <Inline text={block.footer} />
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TimelineBlock({ block }: { block: Extract<Block, { type: 'timeline' }> }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Heading eyebrow={block.eyebrow} title={block.title} />
      <ol className="relative space-y-10 border-l-2 border-alm-line pl-8">
        {block.items.map(item => (
          <li key={item.year + (item.title ?? '')} className="relative">
            <span className="absolute -left-[2.6rem] top-1 h-4 w-4 rounded-full border-4 border-alm-cream bg-alm-wood" />
            <p className="font-display text-2xl font-semibold text-alm-wood">{item.year}</p>
            {item.title && <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>}
            <p className="mt-2 text-lg leading-relaxed text-alm-stone/85">
              <Inline text={item.text} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function PartnersBlock({ block }: { block: Extract<Block, { type: 'partners' }> }) {
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map(item => (
          <li key={item.name} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-alm-line">
            <IconBadge name={item.icon} className="h-11 w-11" />
            <div className="min-w-0">
              <h3 className="font-semibold leading-snug">{item.name}</h3>
              {item.place && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-alm-muted">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.place}
                </p>
              )}
              <p className="mt-2 text-alm-stone/85">{item.products}</p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-alm-wood hover:underline"
                >
                  {hostname(item.url)}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {block.note && (
        <p className="mx-auto mt-8 max-w-2xl text-center text-alm-muted">
          <Inline text={block.note} />
        </p>
      )}
    </div>
  )
}

function RoutesBlock({ block }: { block: Extract<Block, { type: 'routes' }> }) {
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
      <div className="space-y-8">
        {block.items.map((route, i) => (
          <article key={route.title} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-alm-line">
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-alm-forest font-display text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-semibold">{route.title}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                    {route.duration && <Chip icon={<Clock className="h-4 w-4" />}>{route.duration}</Chip>}
                    {route.distance && <Chip icon={<Route className="h-4 w-4" />}>{route.distance}</Chip>}
                    {route.up && <Chip icon={<MoveUp className="h-4 w-4" />}>{route.up}</Chip>}
                    {route.down && <Chip icon={<MoveDown className="h-4 w-4" />}>{route.down}</Chip>}
                  </ul>
                </div>
              </div>
              <p className="mt-5 text-lg leading-relaxed text-alm-stone/85">
                <Inline text={route.text} />
              </p>
              {route.gpx && (
                <a href={route.gpx} download className={`${textLink} mt-5`}>
                  <Download aria-hidden="true" className="h-4 w-4" />
                  GPX-Track herunterladen
                </a>
              )}
            </div>
            {route.gpx && (
              <div className="px-4 pb-4 md:px-6 md:pb-6">
                <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-alm-sand md:h-96" />}>
                  <GpxMap url={route.gpx} label={route.title} />
                </Suspense>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-alm-sand px-3 py-1 font-semibold text-alm-stone/80">
      <span aria-hidden="true" className="text-alm-wood">
        {icon}
      </span>
      {children}
    </li>
  )
}

function CtaBlock({ block }: { block: Extract<Block, { type: 'cta' }> }) {
  const src = assetUrl(block.image?.src)
  return (
    <div className="relative overflow-hidden rounded-3xl bg-alm-wood text-white shadow-lg">
      {src && <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      <div className={`absolute inset-0 ${src ? 'bg-linear-to-r from-black/75 via-black/50 to-black/10' : ''}`} />
      <div className="relative max-w-2xl px-6 py-12 md:px-12 md:py-16">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">{block.title}</h2>
        {block.text && (
          <p className="mt-4 text-lg leading-relaxed text-white/90">
            <Inline text={block.text} strongClassName="text-white" />
          </p>
        )}
        <SmartLink
          link={block.link}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-alm-forest shadow transition hover:bg-alm-cream"
        >
          {block.link.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </SmartLink>
      </div>
    </div>
  )
}

function QuoteBlock({ block }: { block: Extract<Block, { type: 'quote' }> }) {
  return (
    <figure className="mx-auto max-w-3xl text-center">
      <Quote aria-hidden="true" className="mx-auto h-10 w-10 text-alm-wood/60" />
      <blockquote className="mt-4 font-display text-2xl leading-snug md:text-3xl">
        <Inline text={block.text} />
      </blockquote>
      {block.author && <figcaption className="mt-5 font-semibold text-alm-wood">{block.author}</figcaption>}
    </figure>
  )
}

// ---------- dynamische Bausteine ----------

function EditLink({ to, children }: { to: string; children: ReactNode }) {
  const { user } = useAuth()
  if (!isEditor(user)) return null
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-alm-stone ring-1 ring-alm-line hover:bg-white"
    >
      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </Link>
  )
}

function InfoBlock({ first }: { first: boolean }) {
  const { settings } = useSite()
  const cards = [
    settings.news && { title: 'Aktuelles', html: settings.news, highlight: true },
    settings.opening_hours && { title: 'Öffnungszeiten', html: settings.opening_hours, highlight: false, closures: true },
  ].filter((c): c is { title: string; html: string; highlight: boolean; closures?: boolean } => !!c)
  if (cards.length === 0) return null
  return (
    <section className={`grid items-start gap-4 ${first ? 'relative z-10 -mt-12' : ''} ${cards.length > 1 ? 'md:grid-cols-2' : ''}`}>
      {cards.map(card => (
        <div
          key={card.title}
          className={`rounded-2xl p-6 shadow-lg ring-1 md:p-8 ${card.highlight ? 'bg-alm-wood text-white ring-alm-wood' : 'bg-white ring-alm-line'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold">
              <Icon name={card.highlight ? 'info' : 'clock'} className={`h-6 w-6 ${card.highlight ? 'text-alm-sand' : 'text-alm-wood'}`} />
              {card.title}
            </h2>
            <EditLink to="/admin">Bearbeiten</EditLink>
          </div>
          <RichText html={card.html} tone={card.highlight ? 'dark' : 'light'} className="mt-4" />
          {card.closures && <ClosureList className="mt-5" />}
        </div>
      ))}
    </section>
  )
}

const dateFormat = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('de-AT', { month: 'short' })

function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Link auf die aktuelle Seite (ohne Query/Hash) für den Kalendereintrag
function pageUrl(): string {
  return window.location.origin + window.location.pathname
}

export function EventCard({ event }: { event: HongarEvent }) {
  const day = parseDate(event.event_date)
  return (
    <li className="flex gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-alm-line md:p-6">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-alm-forest py-2 text-white">
        <span className="font-display text-2xl font-semibold leading-none">{day.getDate()}</span>
        <span className="mt-1 text-xs uppercase tracking-wider text-alm-sand">{monthFormat.format(day)}</span>
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold leading-snug">{event.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-alm-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            {dateFormat.format(day)}
          </span>
          {event.time_label && (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {event.time_label}
            </span>
          )}
        </p>
        {event.description && <p className="mt-2 whitespace-pre-line text-alm-stone/85">{event.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-alm-forest">
          <button
            type="button"
            onClick={() => downloadIcs(event, pageUrl())}
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            In Kalender eintragen
          </button>
          <a
            href={googleCalendarUrl(event, pageUrl())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Google Kalender
          </a>
        </div>
      </div>
    </li>
  )
}

function EventsBlock({ block }: { block: Extract<Block, { type: 'events' }> }) {
  const [events, setEvents] = useState<HongarEvent[] | null>(null)

  useEffect(() => {
    let cancelled = false
    api<HongarEvent[]>('/hongar/events')
      .then(e => !cancelled && setEvents(e))
      .catch(() => !cancelled && setEvents([]))
    return () => {
      cancelled = true
    }
  }, [])

  const shown = block.limit ? events?.slice(0, block.limit) : events
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end empty:hidden">
          <EditLink to="/admin/veranstaltungen">Veranstaltungen verwalten</EditLink>
        </div>
        {events === null ? (
          <div className="h-28 animate-pulse rounded-2xl bg-alm-sand" />
        ) : shown && shown.length > 0 ? (
          <ul className="space-y-4">
            {shown.map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-alm-muted ring-1 ring-alm-line">
            Derzeit sind keine Veranstaltungen geplant – schau bald wieder vorbei!
          </p>
        )}
        {block.link && shown && shown.length > 0 && (
          <div className="mt-6 text-center">
            <LinkButton link={block.link} variant="text" />
          </div>
        )}
      </div>
    </div>
  )
}

function TeasersBlock({ block, page }: { block: Extract<Block, { type: 'teasers' }>; page: ContentPage }) {
  const { content } = useSite()
  const pages = block.slugs
    ? block.slugs.map(s => content.pages.find(p => p.slug === s)).filter((p): p is ContentPage => !!p)
    : childPages(content.pages, page.slug)
  if (pages.length === 0) return null
  return (
    <div>
      <Heading eyebrow={block.eyebrow} title={block.title} center />
      <TeaserGrid pages={pages} />
    </div>
  )
}

function WebcamBlock({ block }: { block: Extract<Block, { type: 'webcam' }> }) {
  const { settings } = useSite()
  const webcam = webcamUrls(settings.webcam_urls)[0]
  const [tick] = useState(() => Date.now())
  if (!webcam) return null
  return (
    <section className="overflow-hidden rounded-3xl bg-alm-forest text-alm-cream shadow-lg md:grid md:grid-cols-2">
      <img
        src={withCacheBuster(webcam, tick)}
        alt="Aktuelles Webcam-Bild"
        referrerPolicy="no-referrer"
        className="aspect-video h-full w-full object-cover object-left"
      />
      <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
        <h2 className="font-display text-3xl font-semibold">{block.title ?? 'Wie schaut’s heute aus?'}</h2>
        {block.text && <p className="text-lg text-alm-cream/80">{block.text}</p>}
        <Link to="/webcam" className="inline-flex items-center gap-2 font-semibold text-alm-sand hover:underline">
          Zur Webcam
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function ContactBlock({ block }: { block: Extract<Block, { type: 'contact' }> }) {
  const { settings } = useSite()
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-alm-line md:p-8">
        <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
          <IconBadge name="pin" className="h-11 w-11" />
          {block.title ?? 'So erreichst du uns'}
        </h2>
        {settings.contact && <RichText html={settings.contact} className="mt-5" />}
        <Paragraphs text={block.text} className="mt-4 text-base!" />
        {block.mapUrl && (
          <a href={block.mapUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} mt-6`}>
            <MapPin aria-hidden="true" className="h-4 w-4" />
            Route planen
          </a>
        )}
      </div>
      <div className="rounded-3xl bg-alm-sand/70 p-6 ring-1 ring-alm-line md:p-8">
        <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
          <IconBadge name="clock" className="h-11 w-11 bg-white" />
          Öffnungszeiten
        </h2>
        {settings.opening_hours ? (
          <RichText html={settings.opening_hours} className="mt-5" />
        ) : (
          <p className="mt-5 text-alm-muted">Bitte telefonisch nachfragen.</p>
        )}
        <ClosureList className="mt-5" />
      </div>
    </div>
  )
}

function CreditsBlock({ block }: { block: Extract<Block, { type: 'credits' }> }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-semibold">{block.title ?? 'Bildnachweis'}</h2>
      <p className="mt-2 text-alm-muted">
        Einige Fotos stammen von Wikimedia Commons und stehen unter freien Lizenzen. Sie wurden verkleinert.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {IMAGE_CREDITS.map(c => (
          <li key={c.file}>
            <a href={c.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-alm-wood hover:underline">
              {c.title}
            </a>{' '}
            – {c.author},{' '}
            <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {c.license}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Zusammenbau ----------

function renderBlock(block: Block, page: ContentPage, index: number) {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} />
    case 'split':
      return <SplitBlock block={block} />
    case 'stats':
      return <StatsBlock block={block} />
    case 'features':
      return <FeaturesBlock block={block} />
    case 'lists':
      return <ListsBlock block={block} />
    case 'notice':
      return <NoticeBlock block={block} />
    case 'timeline':
      return <TimelineBlock block={block} />
    case 'partners':
      return <PartnersBlock block={block} />
    case 'routes':
      return <RoutesBlock block={block} />
    case 'cta':
      return <CtaBlock block={block} />
    case 'gallery':
      return (
        <div>
          <Heading title={block.title} center />
          <Gallery images={block.images} />
        </div>
      )
    case 'quote':
      return <QuoteBlock block={block} />
    case 'html':
      return <RichText html={block.html} className="mx-auto max-w-3xl md:prose-lg" />
    case 'info':
      return <InfoBlock first={index === 0} />
    case 'events':
      return <EventsBlock block={block} />
    case 'teasers':
      return <TeasersBlock block={block} page={page} />
    case 'webcam':
      return <WebcamBlock block={block} />
    case 'contact':
      return <ContactBlock block={block} />
    case 'credits':
      return <CreditsBlock block={block} />
    default:
      // Unbekannter Typ (z.B. neuer Inhalt, altes Frontend): still überspringen.
      return null
  }
}

export default function Blocks({ page }: { page: ContentPage }) {
  // Aktuelles/Öffnungszeiten ganz oben ragen in das Titelbild hinein.
  const overlap = page.blocks[0]?.type === 'info'
  return (
    <div className={`mx-auto max-w-6xl space-y-20 px-4 pb-8 sm:px-6 md:space-y-28 ${overlap ? '' : 'pt-14 md:pt-20'}`}>
      {page.blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block, page, i)}</Fragment>
      ))}
    </div>
  )
}

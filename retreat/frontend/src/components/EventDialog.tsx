import { useState, type FormEvent, type ReactNode } from 'react'
import { CalendarPlus, Download, Trash2 } from 'lucide-react'
import { downloadIcs, outlookUrl } from '../lib/addToCalendar'
import { convertZone, dayOf, formatDay, timeOf } from '../lib/agenda'
import { personName } from '../lib/people'
import { useRetreat } from '../lib/retreat'
import type { Category, EventInput, RetreatEvent } from '../lib/types'
import { FIELD, Modal, SheetBody, SheetHeader, TEXT_BUTTON, TEXT_BUTTON_BOLD } from './Modal'
import {
  CATEGORY,
  CategoryChip,
  CheckRow,
  MapsLink,
  MapsUrlLink,
  PhoneLink,
  Row,
  Section,
  Select,
  ValueRow,
  WebLink,
} from './ui'

interface Props {
  /** null = neuen Termin anlegen */
  event: RetreatEvent | null
  /** Vorbelegung für neue Termine */
  draft?: Partial<EventInput>
  onClose: () => void
}

export function EventDialog({ event, draft, onClose }: Props) {
  const { me } = useRetreat()
  const [editing, setEditing] = useState(event === null)

  return (
    <Modal label={event ? event.title : 'Neuer Termin'} onClose={onClose}>
      {close =>
        editing && me.is_orga ? (
          <EventForm event={event} draft={draft} onDone={close} onCancel={event ? () => setEditing(false) : close} />
        ) : (
          event && <EventView event={event} onEdit={() => setEditing(true)} onClose={close} />
        )
      }
    </Modal>
  )
}

// --- Ansicht --------------------------------------------------------------------

function EventView({ event, onEdit, onClose }: { event: RetreatEvent; onEdit: () => void; onClose: () => void }) {
  const { me, places, deleteEvent } = useRetreat()
  const [error, setError] = useState<string | null>(null)
  const place = event.place ? places.get(event.place) : undefined

  const remove = async () => {
    if (!window.confirm(`„${event.title}“ wirklich löschen?`)) return
    const err = await deleteEvent(event.id)
    if (err) setError(err)
    else onClose()
  }

  return (
    <>
      <SheetHeader
        left={
          <button type="button" onClick={onClose} className={TEXT_BUTTON}>
            Schließen
          </button>
        }
        title={CATEGORY[event.category].label}
        right={
          me.is_orga && (
            <button type="button" onClick={onEdit} className={TEXT_BUTTON_BOLD}>
              Bearbeiten
            </button>
          )
        }
      />
      <SheetBody>
        <h3 className="mt-2 px-1 text-[24px] leading-tight font-bold">{event.title}</h3>
        <div className="mt-2 px-1">
          <CategoryChip category={event.category} />
        </div>
        <Section title="Zeit">
          <ValueRow label="Tag">{formatDay(dayOf(event.start))}</ValueRow>
          <ValueRow label="Teneriffa">
            <span className="font-semibold text-black">
              {timeOf(event.start)}–{timeOf(event.end)} Uhr
            </span>
          </ValueRow>
          <ValueRow label="Österreich">
            {timeOf(convertZone(event.start))}–{timeOf(convertZone(event.end))} Uhr
          </ValueRow>
        </Section>
        {place && (
          <Section title="Ort">
            <Row>
              <MapsLink place={place} />
              {place.address && <p className="text-[13px] text-grey">{place.address}</p>}
            </Row>
            {place.phone && (
              <Row>
                <PhoneLink phone={place.phone} />
              </Row>
            )}
          </Section>
        )}
        {event.note && (
          <Section title={event.category === 'activity' ? 'Beschreibung' : 'Notiz'}>
            <Row>
              <p className="whitespace-pre-line">{event.note}</p>
            </Row>
          </Section>
        )}
        <EventExtras event={event} />
        <Section title="Kalender" footer="Outlook öffnet sich im Browser mit deinem Microsoft-365-Konto. Für andere Kalender die .ics-Datei nehmen.">
          <Row>
            <a
              href={outlookUrl(event, place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent-blue active:opacity-60"
            >
              <CalendarPlus size={16} aria-hidden />
              Zu Outlook hinzufügen
            </a>
          </Row>
          <Row onClick={() => downloadIcs(event, place)}>
            <span className="inline-flex items-center gap-1.5 text-accent-blue">
              <Download size={16} aria-hidden />
              Kalenderdatei (.ics)
            </span>
          </Row>
        </Section>
        {me.is_orga && (
          <Section>
            <Row onClick={remove}>
              <span className="inline-flex items-center gap-2">
                <Trash2 size={18} aria-hidden /> Termin löschen
              </span>
            </Row>
          </Section>
        )}
        {error && <p className="mt-3 px-4 text-[15px] font-semibold">⚠︎ {error}</p>}
      </SheetBody>
    </>
  )
}

/** Koordination, Teilnehmende, Links – nur was befüllt ist. */
function EventExtras({ event }: { event: RetreatEvent }) {
  const { me, people } = useRetreat()
  const byId = new Map(people.map(p => [p.id, p]))
  const coordinator = event.coordinator_id ? byId.get(event.coordinator_id) : undefined
  const participants = event.participant_ids.map(id => byId.get(id)).filter(p => p !== undefined)
  const you = (id: number) => (id === me.id ? ' (du)' : '')

  return (
    <>
      {coordinator && (
        <Section title="Koordination">
          <Row>
            {personName(coordinator)}
            {you(coordinator.id)}
          </Row>
        </Section>
      )}
      {participants.length > 0 && (
        <Section title={`Teilnehmende (${participants.length})`}>
          {participants.length === people.length ? (
            <Row>Alle</Row>
          ) : (
            participants.map(p => (
              <Row key={p.id} highlight={p.id === me.id}>
                {personName(p)}
                {you(p.id)}
              </Row>
            ))
          )}
        </Section>
      )}
      {(event.maps_url || event.url) && (
        <Section title="Links">
          {event.maps_url && (
            <Row>
              <MapsUrlLink href={event.maps_url} />
            </Row>
          )}
          {event.url && (
            <Row>
              <WebLink href={event.url}>Weitere Infos</WebLink>
            </Row>
          )}
        </Section>
      )}
    </>
  )
}

// --- Formular (nur Orga) ----------------------------------------------------------

function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Row>
      <label className="flex items-center justify-between gap-3">
        <span className="shrink-0">{label}</span>
        {children}
      </label>
    </Row>
  )
}

const PICKER = 'bg-transparent text-right text-[16px] text-royal-blue'

function EventForm({
  event,
  draft,
  onDone,
  onCancel,
}: {
  event: RetreatEvent | null
  draft?: Partial<EventInput>
  onDone: () => void
  onCancel: () => void
}) {
  const { content, people, saveEvent } = useRetreat()
  const base = {
    start: event?.start ?? draft?.start ?? '2026-10-18T09:00',
    end: event?.end ?? draft?.end ?? '2026-10-18T10:00',
  }
  const [day, setDay] = useState(dayOf(base.start))
  const [start, setStart] = useState(timeOf(base.start))
  const [end, setEnd] = useState(timeOf(base.end))
  const [title, setTitle] = useState(event?.title ?? '')
  const [category, setCategory] = useState<Category>(event?.category ?? draft?.category ?? 'activity')
  const [place, setPlace] = useState<string | null>(event?.place ?? null)
  const [note, setNote] = useState(event?.note ?? '')
  const [mapsUrl, setMapsUrl] = useState(event?.maps_url ?? '')
  const [url, setUrl] = useState(event?.url ?? '')
  const [coordinator, setCoordinator] = useState<number | null>(event?.coordinator_id ?? null)
  const [participants, setParticipants] = useState(() => new Set(event?.participant_ids ?? []))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sortedPeople = [...people].sort((a, b) => personName(a).localeCompare(personName(b), 'de'))
  // Ende vor/gleich Start -> endet am Folgetag (z.B. 22:00–01:00)
  const startDt = `${day}T${start}`
  const endDt = `${end <= start ? nextDay(day) : day}T${end}`
  const valid =
    title.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(day) && /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)
  const urlError = [mapsUrl, url].some(u => u.trim() && !/^https?:\/\/\S+$/.test(u.trim()))
    ? 'Links müssen mit http:// oder https:// beginnen.'
    : null

  const toggle = (id: number) =>
    setParticipants(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || urlError) return
    setBusy(true)
    const err = await saveEvent(event?.id ?? null, {
      start: startDt,
      end: endDt,
      title: title.trim(),
      category,
      place,
      note: note.trim() || null,
      maps_url: mapsUrl.trim() || null,
      url: url.trim() || null,
      coordinator_id: coordinator,
      participant_ids: [...participants],
    })
    setBusy(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <SheetHeader
        left={
          <button type="button" onClick={onCancel} className={TEXT_BUTTON}>
            Abbrechen
          </button>
        }
        title={event ? 'Bearbeiten' : category === 'activity' ? 'Neue Aktivität' : 'Neuer Termin'}
        right={
          <button type="submit" disabled={busy || !valid || !!urlError} className={TEXT_BUTTON_BOLD}>
            Sichern
          </button>
        }
      />
      <SheetBody>
        {(urlError || error) && (
          <p role="alert" className="mt-2 rounded-xl bg-white p-3 text-[15px] font-semibold">
            ⚠︎ {urlError ?? error}
          </p>
        )}
        <Section>
          <Row>
            <input
              className={`${FIELD} text-[17px] font-semibold`}
              placeholder="Titel"
              aria-label="Titel"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </Row>
        </Section>

        <Section
          footer={
            <>
              Zeiten in Teneriffa-Zeit – in Österreich {timeOf(convertZone(startDt))}–{timeOf(convertZone(endDt))} Uhr
              {end <= start && ' (endet am Folgetag)'}.
            </>
          }
        >
          <FieldRow label="Tag">
            <input type="date" className={PICKER} value={day} onChange={e => setDay(e.target.value)} required />
          </FieldRow>
          <FieldRow label="Beginn">
            <input type="time" className={PICKER} value={start} onChange={e => setStart(e.target.value)} required />
          </FieldRow>
          <FieldRow label="Ende">
            <input type="time" className={PICKER} value={end} onChange={e => setEnd(e.target.value)} required />
          </FieldRow>
        </Section>

        <Section>
          <FieldRow label="Kategorie">
            <Select
              label="Kategorie"
              value={category}
              options={(Object.keys(CATEGORY) as Category[]).map(c => ({ value: c, label: CATEGORY[c].label }))}
              onChange={v => v && setCategory(v)}
            />
          </FieldRow>
          <FieldRow label="Ort">
            <Select
              label="Ort"
              value={place}
              emptyLabel="Keiner"
              options={content.places.map(p => ({ value: p.id, label: p.name }))}
              onChange={setPlace}
            />
          </FieldRow>
        </Section>

        <Section title={category === 'activity' ? 'Beschreibung' : 'Notiz'}>
          <Row>
            <textarea
              className={`${FIELD} resize-none`}
              rows={3}
              placeholder="Optional"
              aria-label={category === 'activity' ? 'Beschreibung' : 'Notiz'}
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
            />
          </Row>
        </Section>

        <Section title="Links & Koordination" footer="Optional – wird nur angezeigt, wenn befüllt.">
          <Row>
            <input
              className={FIELD}
              type="url"
              inputMode="url"
              placeholder="Google-Maps-Link"
              aria-label="Google-Maps-Link"
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
            />
          </Row>
          <Row>
            <input
              className={FIELD}
              type="url"
              inputMode="url"
              placeholder="Info-Link"
              aria-label="Info-Link"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </Row>
          <FieldRow label="Koordination">
            <Select
              label="Koordination"
              value={coordinator}
              emptyLabel="Niemand"
              options={sortedPeople.map(p => ({ value: p.id, label: personName(p) }))}
              onChange={setCoordinator}
            />
          </FieldRow>
        </Section>

        <Section
          title={`Teilnehmende (${participants.size})`}
          action={
            <span className="flex gap-4 text-[15px] text-royal-blue">
              <button type="button" onClick={() => setParticipants(new Set(people.map(p => p.id)))}>
                Alle
              </button>
              <button type="button" onClick={() => setParticipants(new Set())}>
                Keine
              </button>
            </span>
          }
          footer="Ohne Eintragung gelten Arbeitsblock, Mahlzeit und Transfer im „Mein Kalender“ für alle, Aktivitäten für niemanden."
        >
          <div className="max-h-72 overflow-y-auto">
            {sortedPeople.map(p => (
              <CheckRow key={p.id} checked={participants.has(p.id)} onToggle={() => toggle(p.id)}>
                {personName(p)}
              </CheckRow>
            ))}
          </div>
        </Section>
      </SheetBody>
    </form>
  )
}

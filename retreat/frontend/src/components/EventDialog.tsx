import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { convertZone, dayOf, formatDay, timeOf } from '../lib/agenda'
import { useRetreat } from '../lib/retreat'
import { personName } from '../lib/people'
import type { Category, EventInput, RetreatEvent } from '../lib/types'
import { ActivityInfo } from './ActivityInfo'
import { INPUT, Modal, ModalHeader as Header } from './Modal'
import { CATEGORY, CategoryChip, MapsLink } from './ui'

interface Props {
  /** null = neuen Termin anlegen */
  event: RetreatEvent | null
  /** Vorbelegung für neue Termine */
  draft?: Partial<EventInput>
  /** direkt im Bearbeiten-Modus öffnen */
  startEditing?: boolean
  onClose: () => void
}

export function EventDialog({ event, draft, startEditing = false, onClose }: Props) {
  const { me } = useRetreat()
  const [editing, setEditing] = useState(event === null || startEditing)

  return (
    <Modal label={event ? event.title : 'Neuer Termin'} onClose={onClose}>
      {editing && me.is_orga ? (
        <EventForm
          event={event}
          draft={draft}
          onDone={onClose}
          onCancel={event && !startEditing ? () => setEditing(false) : onClose}
        />
      ) : (
        event && <EventView event={event} onEdit={() => setEditing(true)} onClose={onClose} />
      )}
    </Modal>
  )
}

function EventView({ event, onEdit, onClose }: { event: RetreatEvent; onEdit: () => void; onClose: () => void }) {
  const { me, places, deleteEvent } = useRetreat()
  const [error, setError] = useState<string | null>(null)
  const place = event.place ? places.get(event.place) : undefined
  const home = { start: convertZone(event.start), end: convertZone(event.end) }

  const remove = async () => {
    if (!window.confirm(`„${event.title}“ wirklich löschen?`)) return
    const err = await deleteEvent(event.id)
    if (err) setError(err)
    else onClose()
  }

  return (
    <>
      <Header title={event.title} onClose={onClose} />
      <div className="mt-2">
        <CategoryChip category={event.category} />
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-grey">Tag</dt>
        <dd>{formatDay(dayOf(event.start))}</dd>
        <dt className="text-grey">Teneriffa</dt>
        <dd className="font-semibold">
          {timeOf(event.start)}–{timeOf(event.end)} Uhr
        </dd>
        <dt className="text-grey">Österreich</dt>
        <dd>
          {timeOf(home.start)}–{timeOf(home.end)} Uhr
        </dd>
      </dl>
      {place && (
        <div className="mt-3 text-sm">
          <MapsLink place={place} />
          {place.address && <p className="text-grey">{place.address}</p>}
        </div>
      )}
      {event.note && <p className="mt-3 text-sm">{event.note}</p>}
      {event.category === 'activity' && (
        <div className="mt-3">
          <ActivityInfo event={event} expanded />
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold">⚠ {error}</p>}
      {me.is_orga && (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-royal-blue px-3 py-2 text-sm font-semibold text-white"
          >
            <Pencil size={16} /> Bearbeiten
          </button>
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-grey-50 px-3 py-2 text-sm"
          >
            <Trash2 size={16} /> Löschen
          </button>
        </div>
      )}
    </>
  )
}

function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

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
  const [place, setPlace] = useState(event?.place ?? '')
  const [note, setNote] = useState(event?.note ?? '')
  // Aktivitäts-Felder
  const [mapsUrl, setMapsUrl] = useState(event?.maps_url ?? '')
  const [url, setUrl] = useState(event?.url ?? '')
  const [coordinator, setCoordinator] = useState<number | null>(event?.coordinator_id ?? null)
  const [participants, setParticipants] = useState(() => new Set(event?.participant_ids ?? []))
  const isActivity = category === 'activity'
  const sortedPeople = [...people].sort((a, b) => personName(a).localeCompare(personName(b), 'de'))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Ende vor/gleich Start -> endet am Folgetag (z.B. 22:00–01:00)
  const startDt = `${day}T${start}`
  const endDt = `${end <= start ? nextDay(day) : day}T${end}`
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(day) && /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)
  const urlError =
    isActivity && [mapsUrl, url].some(u => u.trim() && !/^https?:\/\/\S+$/.test(u.trim()))
      ? 'Links müssen mit http:// oder https:// beginnen.'
      : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (urlError) return
    setBusy(true)
    const err = await saveEvent(event?.id ?? null, {
      start: startDt,
      end: endDt,
      title: title.trim(),
      category,
      place: place || null,
      note: note.trim() || null,
      // Nur Aktivitäten haben Links, Koordination und Teilnehmende
      maps_url: isActivity ? mapsUrl.trim() || null : null,
      url: isActivity ? url.trim() || null : null,
      coordinator_id: isActivity ? coordinator : null,
      participant_ids: isActivity ? [...participants] : [],
    })
    setBusy(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <form onSubmit={submit}>
      <Header
        title={
          event
            ? isActivity
              ? 'Aktivität bearbeiten'
              : 'Termin bearbeiten'
            : isActivity
              ? 'Neue Aktivität'
              : 'Neuer Termin'
        }
        onClose={onCancel}
      />
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Titel</span>
          <input className={INPUT} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="col-span-2 block text-sm sm:col-span-1">
            <span className="font-medium">Tag</span>
            <input type="date" className={INPUT} value={day} onChange={e => setDay(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Beginn</span>
            <input type="time" className={INPUT} value={start} onChange={e => setStart(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Ende</span>
            <input type="time" className={INPUT} value={end} onChange={e => setEnd(e.target.value)} required />
          </label>
        </div>
        <p className="rounded-lg bg-royal-blue-25 px-3 py-2 text-sm">
          Zeiten in <strong>Teneriffa-Zeit</strong>.
          {valid && (
            <>
              {' '}
              In Österreich: {timeOf(convertZone(startDt))}–{timeOf(convertZone(endDt))} Uhr
            </>
          )}
          {valid && end <= start && ' (endet am Folgetag)'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-medium">Kategorie</span>
            <select className={INPUT} value={category} onChange={e => setCategory(e.target.value as Category)}>
              {(Object.keys(CATEGORY) as Category[]).map(c => (
                <option key={c} value={c}>
                  {CATEGORY[c].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Ort</span>
            <select className={INPUT} value={place} onChange={e => setPlace(e.target.value)}>
              <option value="">– kein Ort –</option>
              {content.places.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium">{isActivity ? 'Beschreibung' : 'Notiz'}</span>
          <textarea className={INPUT} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
        </label>
        {isActivity && (
          <div className="space-y-3 rounded-lg border border-accent-lightgreen bg-accent-lightgreen-25 p-3">
            <p className="text-sm font-semibold">Aktivität</p>
            <label className="block text-sm">
              <span className="font-medium">Google-Maps-Link</span>
              <input
                className={INPUT}
                type="url"
                inputMode="url"
                placeholder="https://maps.app.goo.gl/…"
                value={mapsUrl}
                onChange={e => setMapsUrl(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Koordination</span>
              <select
                className={INPUT}
                value={coordinator ?? ''}
                onChange={e => setCoordinator(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">– niemand –</option>
                {sortedPeople.map(p => (
                  <option key={p.id} value={p.id}>
                    {personName(p)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <legend className="font-medium">Teilnehmende ({participants.size})</legend>
                <span className="flex gap-3 text-accent-blue">
                  <button type="button" onClick={() => setParticipants(new Set(people.map(p => p.id)))}>
                    Alle
                  </button>
                  <button type="button" onClick={() => setParticipants(new Set())}>
                    Keine
                  </button>
                </span>
              </div>
              <div className="mt-1 grid max-h-56 grid-cols-1 gap-x-3 overflow-y-auto rounded-lg border border-grey-50 bg-white p-2 sm:grid-cols-2">
                {sortedPeople.map(p => (
                  <label key={p.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-royal-blue"
                      checked={participants.has(p.id)}
                      onChange={() =>
                        setParticipants(prev => {
                          const next = new Set(prev)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }
                    />
                    {personName(p)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="font-medium">Info-Link (optional)</span>
              <input
                className={INPUT}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
      {(urlError || error) && <p className="mt-3 text-sm font-semibold">⚠ {urlError ?? error}</p>}
      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={busy || !valid || !!urlError}
          className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Speichern
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-grey-50 px-4 py-2 text-sm">
          Abbrechen
        </button>
      </div>
    </form>
  )
}

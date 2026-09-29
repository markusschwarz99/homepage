import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorText } from '../lib/api'
import type { HongarEvent } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { Field, Flash, btnDanger, btnPrimary, btnSecondary, inputClass } from './ui'
import type { FlashMessage } from './ui'

type Draft = Omit<HongarEvent, 'id'>

const EMPTY: Draft = { event_date: '', time_label: '', title: '', description: '' }

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateFormat = new Intl.DateTimeFormat('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

function formatDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  return dateFormat.format(new Date(y, m - 1, d))
}

export default function EventsEditor() {
  const [events, setEvents] = useState<HongarEvent[] | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  useDocumentTitle('Veranstaltungen')

  const load = useCallback(() => {
    api<HongarEvent[]>('/hongar/admin/events')
      .then(setEvents)
      .catch(err => setFlash({ type: 'error', text: errorText(err) }))
  }, [])

  useEffect(load, [load])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function startEdit(event: HongarEvent) {
    setEditId(event.id)
    setDraft({
      event_date: event.event_date,
      time_label: event.time_label,
      title: event.title,
      description: event.description,
    })
    setFlash(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setEditId(null)
    setDraft(EMPTY)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFlash(null)
    try {
      await api(editId === null ? '/hongar/events' : `/hongar/events/${editId}`, {
        method: editId === null ? 'POST' : 'PATCH',
        body: JSON.stringify(draft),
      })
      setFlash({ type: 'success', text: editId === null ? 'Veranstaltung eingetragen.' : 'Änderungen gespeichert.' })
      reset()
      load()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(event: HongarEvent) {
    if (!window.confirm(`„${event.title}“ am ${formatDate(event.event_date)} wirklich löschen?`)) return
    try {
      await api(`/hongar/events/${event.id}`, { method: 'DELETE' })
      if (editId === event.id) reset()
      setFlash({ type: 'success', text: 'Veranstaltung gelöscht.' })
      load()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    }
  }

  const upcoming = events?.filter(e => e.event_date >= today()) ?? []
  const past = (events?.filter(e => e.event_date < today()) ?? []).reverse()

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Veranstaltungen</h1>
      <p className="mt-2 text-sm text-alm-muted">
        Kommende Termine erscheinen automatisch auf der Seite „Veranstaltungen“ und auf der Startseite. Vergangene
        Termine werden von selbst ausgeblendet.
      </p>

      <div className="mt-6">
        <Flash flash={flash} onClose={() => setFlash(null)} />
      </div>

      <form onSubmit={save} className="space-y-5 rounded-2xl border border-alm-line bg-white p-5 md:p-6">
        <h2 className="font-display text-xl font-semibold">
          {editId === null ? 'Neue Veranstaltung' : 'Veranstaltung bearbeiten'}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Datum" htmlFor="ev-date">
            <input
              id="ev-date"
              type="date"
              required
              value={draft.event_date}
              onChange={e => set('event_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Uhrzeit (optional)" htmlFor="ev-time">
            <input
              id="ev-time"
              type="text"
              maxLength={50}
              value={draft.time_label}
              onChange={e => set('time_label', e.target.value)}
              placeholder="z.B. 10 Uhr"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Titel" htmlFor="ev-title">
          <input
            id="ev-title"
            type="text"
            required
            maxLength={200}
            value={draft.title}
            onChange={e => set('title', e.target.value)}
            placeholder="z.B. Bergmesse"
            className={inputClass}
          />
        </Field>
        <Field label="Beschreibung (optional)" htmlFor="ev-desc">
          <textarea
            id="ev-desc"
            rows={3}
            maxLength={5000}
            value={draft.description}
            onChange={e => set('description', e.target.value)}
            placeholder="z.B. mit anschließendem Frühschoppen"
            className={inputClass}
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Speichert …' : editId === null ? 'Eintragen' : 'Speichern'}
          </button>
          {editId !== null && (
            <button type="button" className={btnSecondary} onClick={reset}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Kommende Termine</h2>
        {events === null && !flash && <p className="mt-4 text-alm-muted">Wird geladen …</p>}
        {events !== null && upcoming.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-alm-line bg-white p-6 text-alm-muted">
            Keine kommenden Termine eingetragen.
          </p>
        )}
        <EventList events={upcoming} editId={editId} onEdit={startEdit} onDelete={remove} />
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <button type="button" onClick={() => setShowPast(s => !s)} className="font-semibold text-alm-wood hover:underline">
            {showPast ? 'Vergangene Termine ausblenden' : `Vergangene Termine anzeigen (${past.length})`}
          </button>
          {showPast && <EventList events={past} editId={editId} onEdit={startEdit} onDelete={remove} muted />}
        </section>
      )}
    </div>
  )
}

function EventList({
  events,
  editId,
  onEdit,
  onDelete,
  muted = false,
}: {
  events: HongarEvent[]
  editId: number | null
  onEdit: (event: HongarEvent) => void
  onDelete: (event: HongarEvent) => void
  muted?: boolean
}) {
  if (events.length === 0) return null
  return (
    <ul className={`mt-4 space-y-2 ${muted ? 'opacity-70' : ''}`}>
      {events.map(event => (
        <li
          key={event.id}
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-white px-4 py-3 ${editId === event.id ? 'border-alm-forest ring-2 ring-alm-forest/20' : 'border-alm-line'}`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-alm-wood">
              {formatDate(event.event_date)}
              {event.time_label && ` · ${event.time_label}`}
            </div>
            <div className="font-semibold">{event.title}</div>
            {event.description && <div className="mt-0.5 line-clamp-2 text-sm text-alm-muted">{event.description}</div>}
          </div>
          <div className="flex gap-2">
            <button type="button" className={`${btnSecondary} px-3 py-1.5 text-sm`} onClick={() => onEdit(event)}>
              Bearbeiten
            </button>
            <button type="button" className={`${btnDanger} px-3 py-1.5 text-sm`} onClick={() => onDelete(event)}>
              Löschen
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

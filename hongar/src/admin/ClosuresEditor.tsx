import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorText } from '../lib/api'
import { formatRange, isCurrent, todayIso } from '../lib/closures'
import { useSite } from '../lib/site'
import type { HongarClosure } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { Field, Flash, btnDanger, btnPrimary, btnSecondary, inputClass } from './ui'
import type { FlashMessage } from './ui'

type Draft = Omit<HongarClosure, 'id'>

const EMPTY: Draft = { start_date: '', end_date: '', note: '' }

export default function ClosuresEditor() {
  const { reload: reloadSite } = useSite()
  const [closures, setClosures] = useState<HongarClosure[] | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  useDocumentTitle('Betriebsurlaub')

  const load = useCallback(() => {
    api<HongarClosure[]>('/hongar/admin/closures')
      .then(setClosures)
      .catch(err => setFlash({ type: 'error', text: errorText(err) }))
  }, [])

  useEffect(load, [load])

  function changed() {
    load()
    reloadSite()
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function startEdit(closure: HongarClosure) {
    setEditId(closure.id)
    setDraft({ start_date: closure.start_date, end_date: closure.end_date, note: closure.note })
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
      await api(editId === null ? '/hongar/closures' : `/hongar/closures/${editId}`, {
        method: editId === null ? 'POST' : 'PATCH',
        body: JSON.stringify(draft),
      })
      setFlash({ type: 'success', text: editId === null ? 'Betriebsurlaub eingetragen.' : 'Änderungen gespeichert.' })
      reset()
      changed()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(closure: HongarClosure) {
    if (!window.confirm(`Betriebsurlaub ${formatRange(closure)} wirklich löschen?`)) return
    try {
      await api(`/hongar/closures/${closure.id}`, { method: 'DELETE' })
      if (editId === closure.id) reset()
      setFlash({ type: 'success', text: 'Betriebsurlaub gelöscht.' })
      changed()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    }
  }

  const today = todayIso()
  const upcoming = closures?.filter(c => c.end_date >= today) ?? []
  const past = (closures?.filter(c => c.end_date < today) ?? []).reverse()

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Betriebsurlaub</h1>
      <p className="mt-2 text-sm text-alm-muted">
        Während des Betriebsurlaubs und schon 60 Tage davor erscheint oben auf jeder Seite ein deutlicher Hinweis.
        Alle kommenden Termine stehen zusätzlich bei den Öffnungszeiten. Nach dem letzten Tag verschwindet der Hinweis
        von selbst.
      </p>

      <div className="mt-6">
        <Flash flash={flash} onClose={() => setFlash(null)} />
      </div>

      <form onSubmit={save} className="space-y-5 rounded-2xl border border-alm-line bg-white p-5 md:p-6">
        <h2 className="font-display text-xl font-semibold">
          {editId === null ? 'Neuer Betriebsurlaub' : 'Betriebsurlaub bearbeiten'}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Erster geschlossener Tag" htmlFor="cl-start">
            <input
              id="cl-start"
              type="date"
              required
              value={draft.start_date}
              onChange={e => set('start_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Letzter geschlossener Tag" htmlFor="cl-end">
            <input
              id="cl-end"
              type="date"
              required
              min={draft.start_date || undefined}
              value={draft.end_date}
              onChange={e => set('end_date', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Hinweis (optional)" htmlFor="cl-note">
          <input
            id="cl-note"
            type="text"
            maxLength={300}
            value={draft.note}
            onChange={e => set('note', e.target.value)}
            placeholder="z.B. Ab 21. November starten wir mit den Wildwochen."
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
        <h2 className="font-display text-2xl font-semibold">Eingetragen</h2>
        {closures === null && !flash && <p className="mt-4 text-alm-muted">Wird geladen …</p>}
        {closures !== null && upcoming.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-alm-line bg-white p-6 text-alm-muted">
            Kein Betriebsurlaub geplant.
          </p>
        )}
        <ClosureList closures={upcoming} today={today} editId={editId} onEdit={startEdit} onDelete={remove} />
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-alm-muted">Vergangen</h2>
          <ClosureList closures={past} today={today} editId={editId} onEdit={startEdit} onDelete={remove} muted />
        </section>
      )}
    </div>
  )
}

function ClosureList({
  closures,
  today,
  editId,
  onEdit,
  onDelete,
  muted = false,
}: {
  closures: HongarClosure[]
  today: string
  editId: number | null
  onEdit: (closure: HongarClosure) => void
  onDelete: (closure: HongarClosure) => void
  muted?: boolean
}) {
  if (closures.length === 0) return null
  return (
    <ul className={`mt-4 space-y-2 ${muted ? 'opacity-70' : ''}`}>
      {closures.map(closure => (
        <li
          key={closure.id}
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-white px-4 py-3 ${editId === closure.id ? 'border-alm-forest ring-2 ring-alm-forest/20' : 'border-alm-line'}`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              {formatRange(closure)}
              {isCurrent(closure, today) && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">läuft gerade</span>
              )}
            </div>
            {closure.note && <div className="mt-0.5 line-clamp-2 text-sm text-alm-muted">{closure.note}</div>}
          </div>
          <div className="flex gap-2">
            <button type="button" className={`${btnSecondary} px-3 py-1.5 text-sm`} onClick={() => onEdit(closure)}>
              Bearbeiten
            </button>
            <button type="button" className={`${btnDanger} px-3 py-1.5 text-sm`} onClick={() => onDelete(closure)}>
              Löschen
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

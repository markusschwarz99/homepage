import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { formatDay, retreatDays } from '../lib/agenda'
import { personName } from '../lib/people'
import { useRetreat } from '../lib/retreat'
import type { Activity } from '../lib/types'
import { INPUT, Modal, ModalHeader, PRIMARY_BUTTON, SECONDARY_BUTTON } from './Modal'

const isHttp = (s: string) => /^https?:\/\/\S+$/.test(s)

/** Anlegen (activity = null) oder Bearbeiten einer Aktivität – nur für die Orga. */
export function ActivityDialog({ activity, onClose }: { activity: Activity | null; onClose: () => void }) {
  const { people, content, saveActivity, deleteActivity } = useRetreat()
  const days = retreatDays(content.events)
  const [day, setDay] = useState(activity?.day ?? days[0] ?? '2026-10-18')
  const [title, setTitle] = useState(activity?.title ?? '')
  const [mapsUrl, setMapsUrl] = useState(activity?.maps_url ?? '')
  const [coordinator, setCoordinator] = useState<number | null>(activity?.coordinator_id ?? null)
  const [participants, setParticipants] = useState(() => new Set(activity?.participant_ids ?? []))
  const [details, setDetails] = useState(activity?.details ?? '')
  const [url, setUrl] = useState(activity?.url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sorted = [...people].sort((a, b) => personName(a).localeCompare(personName(b), 'de'))
  const toggle = (id: number) =>
    setParticipants(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const urlError =
    (mapsUrl.trim() && !isHttp(mapsUrl.trim())) || (url.trim() && !isHttp(url.trim()))
      ? 'Links müssen mit http:// oder https:// beginnen.'
      : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (urlError) return
    setBusy(true)
    const err = await saveActivity(activity?.id ?? null, {
      day,
      title: title.trim(),
      maps_url: mapsUrl.trim() || null,
      coordinator_id: coordinator,
      participant_ids: [...participants],
      details: details.trim() || null,
      url: url.trim() || null,
    })
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  const remove = async () => {
    if (!activity || !window.confirm(`„${activity.title}“ wirklich löschen?`)) return
    const err = await deleteActivity(activity.id)
    if (err) setError(err)
    else onClose()
  }

  return (
    <Modal label={activity ? activity.title : 'Neue Aktivität'} onClose={onClose}>
      <form onSubmit={submit}>
        <ModalHeader title={activity ? 'Aktivität bearbeiten' : 'Neue Aktivität'} onClose={onClose} />
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="block text-sm">
              <span className="font-medium">Name</span>
              <input
                className={INPUT}
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Tag</span>
              <select className={INPUT} value={day} onChange={e => setDay(e.target.value)}>
                {[...new Set([...days, day])].sort().map(d => (
                  <option key={d} value={d}>
                    {formatDay(d)}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
              {sorted.map(p => (
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
            <div className="mt-1 grid max-h-56 grid-cols-1 gap-x-3 overflow-y-auto rounded-lg border border-grey-50 p-2 sm:grid-cols-2">
              {sorted.map(p => (
                <label key={p.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-royal-blue"
                    checked={participants.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  {personName(p)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium">Beschreibung (optional)</span>
            <textarea
              className={INPUT}
              rows={2}
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={500}
            />
          </label>
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
        {(urlError || error) && <p className="mt-3 text-sm font-semibold">⚠ {urlError ?? error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !!urlError} className={PRIMARY_BUTTON}>
            Speichern
          </button>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Abbrechen
          </button>
          {activity && (
            <button type="button" onClick={remove} className={`${SECONDARY_BUTTON} ml-auto`}>
              <Trash2 size={16} /> Löschen
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

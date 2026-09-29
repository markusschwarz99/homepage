import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorText } from '../lib/api'
import { useSite } from '../lib/site'
import type { SiteSettings } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import RichEditor from './RichEditor'
import { Field, Flash, btnPrimary, inputClass } from './ui'
import type { FlashMessage } from './ui'

export default function SettingsEditor() {
  const { reload: reloadSite } = useSite()
  const [data, setData] = useState<SiteSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  useDocumentTitle('Allgemeines')

  useEffect(() => {
    api<SiteSettings>('/hongar/settings')
      .then(setData)
      .catch(err => setFlash({ type: 'error', text: errorText(err) }))
  }, [])

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setData(d => d && { ...d, [key]: value })
    setDirty(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    setFlash(null)
    try {
      const saved = await api<SiteSettings>('/hongar/settings', { method: 'PATCH', body: JSON.stringify(data) })
      setData(saved)
      setDirty(false)
      setFlash({ type: 'success', text: 'Gespeichert.' })
      reloadSite()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Allgemeines</h1>
      <p className="mt-2 text-sm text-alm-muted">Texte und Links, die auf mehreren Seiten erscheinen.</p>

      <div className="mt-6">
        <Flash flash={flash} onClose={() => setFlash(null)} />
      </div>

      {!data ? (
        !flash && <p className="text-alm-muted">Wird geladen …</p>
      ) : (
        <form onSubmit={save} className="space-y-8">
          <Field
            label="Aktuelles"
            hint="Wird auf der Startseite hervorgehoben (z.B. Ruhetage, Veranstaltungshinweise, Stellenangebote). Leer lassen, um nichts anzuzeigen."
          >
            <RichEditor simple value={data.news} onChange={v => set('news', v)} placeholder="z.B. Wir haben Betriebsurlaub …" />
          </Field>
          <Field label="Öffnungszeiten" hint="Auf der Startseite und in der Fußzeile.">
            <RichEditor simple value={data.opening_hours} onChange={v => set('opening_hours', v)} />
          </Field>
          <Field label="Kontakt" hint="Adresse, Telefon und E-Mail – erscheint in der Fußzeile.">
            <RichEditor simple value={data.contact} onChange={v => set('contact', v)} />
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Facebook-Link">
              <input
                type="url"
                value={data.facebook_url}
                onChange={e => set('facebook_url', e.target.value)}
                placeholder="https://www.facebook.com/…"
                className={inputClass}
              />
            </Field>
            <Field label="Buchungs-Link Ferienhaus">
              <input
                type="url"
                value={data.booking_url}
                onChange={e => set('booking_url', e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Webcam-Bilder"
            hint="Eine Bild-Adresse pro Zeile. Angezeigt werden derzeit nur Bilder von https://hongar.at."
          >
            <textarea
              rows={3}
              value={data.webcam_urls}
              onChange={e => set('webcam_urls', e.target.value)}
              placeholder="https://hongar.at/…"
              className={`${inputClass} font-mono text-sm`}
            />
          </Field>

          <div className="sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-alm-line bg-alm-cream/95 px-4 py-3 backdrop-blur">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Speichert …' : 'Speichern'}
            </button>
            {dirty && <span className="text-sm text-alm-muted">Ungespeicherte Änderungen</span>}
          </div>
        </form>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { START_SLUG } from '../config'
import { api, assetUrl, errorText, uploadFile } from '../lib/api'
import { pagePath } from '../lib/nav'
import { useSite } from '../lib/site'
import { slugify } from '../lib/slug'
import type { FullPage, GalleryImage, NavPage } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import GalleryEditor from './GalleryEditor'
import RichEditor from './RichEditor'
import { Field, Flash, Toggle, btnDanger, btnPrimary, btnSecondary, inputClass } from './ui'
import type { FlashMessage } from './ui'

interface FormState {
  title: string
  slug: string
  parent_id: number | null
  show_in_nav: boolean
  is_published: boolean
  cover_image: string | null
  cover_image_url: string | null
  content_html: string
}

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  parent_id: null,
  show_in_nav: true,
  is_published: false,
  cover_image: null,
  cover_image_url: null,
  content_html: '',
}

export default function PageEditor({ pageId }: { pageId?: number }) {
  const isNew = pageId === undefined
  const navigate = useNavigate()
  const location = useLocation()
  const { reload: reloadSite } = useSite()

  const [form, setForm] = useState<FormState | null>(isNew ? EMPTY_FORM : null)
  const [images, setImages] = useState<GalleryImage[]>([])
  const [allPages, setAllPages] = useState<NavPage[]>([])
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [flash, setFlash] = useState<FlashMessage | null>(() => {
    const text = (location.state as { flash?: string } | null)?.flash
    return text ? { type: 'success', text } : null
  })
  const coverInput = useRef<HTMLInputElement>(null)
  useDocumentTitle(isNew ? 'Neue Seite' : form?.title || 'Seite bearbeiten')

  useEffect(() => {
    api<NavPage[]>('/hongar/admin/pages')
      .then(setAllPages)
      .catch(() => setAllPages([]))
  }, [])

  useEffect(() => {
    if (pageId === undefined) return
    api<FullPage>(`/hongar/admin/pages/${pageId}`)
      .then(p => {
        setForm({
          title: p.title,
          slug: p.slug,
          parent_id: p.parent_id,
          show_in_nav: p.show_in_nav,
          is_published: p.is_published,
          cover_image: p.cover_image,
          cover_image_url: p.cover_image_url,
          content_html: p.content_html,
        })
        setImages(p.images)
      })
      .catch(err => setFlash({ type: 'error', text: errorText(err) }))
  }, [pageId])

  // Warnung beim Schließen/Neuladen des Tabs mit ungespeicherten Änderungen.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => f && { ...f, [key]: value })
    setDirty(true)
  }

  function onTitle(title: string) {
    setForm(f => f && { ...f, title, slug: slugTouched ? f.slug : slugify(title) })
    setDirty(true)
  }

  async function onCover(file: File) {
    setCoverBusy(true)
    try {
      const res = await uploadFile<{ filename: string; url: string }>('/hongar/images', file)
      setForm(f => f && { ...f, cover_image: res.filename, cover_image_url: res.url })
      setDirty(true)
    } catch (err) {
      setFlash({ type: 'error', text: `Titelbild: ${errorText(err)}` })
    } finally {
      setCoverBusy(false)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setFlash(null)
    const payload = {
      title: form.title.trim(),
      slug: form.slug,
      parent_id: form.parent_id,
      show_in_nav: form.show_in_nav,
      is_published: form.is_published,
      cover_image: form.cover_image,
      content_html: form.content_html,
    }
    try {
      if (isNew) {
        const created = await api<FullPage>('/hongar/pages', { method: 'POST', body: JSON.stringify(payload) })
        setDirty(false)
        reloadSite()
        navigate(`/admin/seiten/${created.id}`, {
          replace: true,
          state: { flash: 'Seite angelegt. Jetzt kannst du auch Bilder zur Galerie hinzufügen.' },
        })
        return
      }
      const updated = await api<FullPage>(`/hongar/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setForm(f => f && { ...f, slug: updated.slug })
      setDirty(false)
      setFlash({ type: 'success', text: 'Gespeichert.' })
      reloadSite()
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!form || pageId === undefined) return
    if (!window.confirm(`Seite „${form.title}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return
    try {
      await api(`/hongar/pages/${pageId}`, { method: 'DELETE' })
      setDirty(false)
      reloadSite()
      navigate('/admin', { replace: true, state: { flash: `Seite „${form.title}“ gelöscht.` } })
    } catch (err) {
      setFlash({ type: 'error', text: errorText(err) })
    }
  }

  if (!form) {
    return (
      <div>
        <Flash flash={flash} onClose={() => setFlash(null)} />
        {!flash && <p className="text-alm-muted">Wird geladen …</p>}
      </div>
    )
  }

  const hasChildren = allPages.some(p => p.parent_id === pageId)
  const parentOptions = allPages.filter(p => p.parent_id === null && p.id !== pageId)
  const coverSrc = assetUrl(form.cover_image_url)

  return (
    <div>
      <Link to="/admin" className="text-sm text-alm-muted hover:underline">
        ← Alle Seiten
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">{isNew ? 'Neue Seite' : form.title || 'Seite'}</h1>

      <div className="mt-6">
        <Flash flash={flash} onClose={() => setFlash(null)} />
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="grid gap-6 rounded-2xl border border-alm-line bg-white p-5 sm:p-6 md:grid-cols-2">
          <Field label="Titel" htmlFor="page-title">
            <input
              id="page-title"
              required
              maxLength={200}
              value={form.title}
              onChange={e => onTitle(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Kürzel in der Adresse"
            htmlFor="page-slug"
            hint={
              form.slug === START_SLUG
                ? 'Diese Seite ist die Startseite.'
                : `Adresse: ${pagePath(form.slug || 'kuerzel')} – nur a–z, 0–9 und Bindestriche.`
            }
          >
            <input
              id="page-slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={e => {
                setSlugTouched(true)
                update('slug', e.target.value.toLowerCase())
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label="Einordnung im Menü"
            htmlFor="page-parent"
            hint={hasChildren ? 'Diese Seite hat Unterseiten und bleibt deshalb im Hauptmenü.' : undefined}
          >
            <select
              id="page-parent"
              value={form.parent_id ?? ''}
              disabled={hasChildren}
              onChange={e => update('parent_id', e.target.value === '' ? null : Number(e.target.value))}
              className={inputClass}
            >
              <option value="">Hauptmenü</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  Unterseite von „{p.title}“
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-4">
            <Toggle
              checked={form.is_published}
              onChange={v => update('is_published', v)}
              label="Veröffentlicht"
              hint="Nur veröffentlichte Seiten sind auf der Website sichtbar."
            />
            <Toggle
              checked={form.show_in_nav}
              onChange={v => update('show_in_nav', v)}
              label="Im Menü anzeigen"
              hint="Aus z.B. für Impressum und Datenschutz (die stehen in der Fußzeile)."
            />
          </div>
        </div>

        <Field label="Titelbild" hint="Großes Bild oben auf der Seite und auf der Kachel der Startseite.">
          <div className="flex flex-wrap items-center gap-4">
            {coverSrc ? (
              <img src={coverSrc} alt="" className="h-32 w-48 rounded-xl object-cover ring-1 ring-alm-line" />
            ) : (
              <div className="flex h-32 w-48 items-center justify-center rounded-xl border border-dashed border-alm-line bg-white text-sm text-alm-muted">
                Kein Titelbild
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={coverBusy}
                onClick={() => coverInput.current?.click()}
              >
                {coverBusy ? 'Lädt hoch …' : coverSrc ? 'Anderes Bild wählen' : 'Bild wählen'}
              </button>
              {coverSrc && (
                <button
                  type="button"
                  className="text-sm text-red-700 hover:underline"
                  onClick={() => {
                    setForm(f => f && { ...f, cover_image: null, cover_image_url: null })
                    setDirty(true)
                  }}
                >
                  Titelbild entfernen
                </button>
              )}
            </div>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void onCover(file)
              }}
            />
          </div>
        </Field>

        <Field label="Inhalt">
          <RichEditor
            value={form.content_html}
            onChange={html => update('content_html', html)}
            placeholder="Hier den Text der Seite schreiben …"
            onError={text => setFlash({ type: 'error', text })}
          />
        </Field>

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-alm-line bg-alm-cream/95 px-4 py-3 backdrop-blur">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Speichert …' : isNew ? 'Seite anlegen' : 'Speichern'}
          </button>
          {dirty && <span className="text-sm text-alm-muted">Ungespeicherte Änderungen</span>}
          {!isNew && (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={() => void remove()}>
              Seite löschen
            </button>
          )}
        </div>
      </form>

      {pageId !== undefined && (
        <GalleryEditor
          pageId={pageId}
          images={images}
          setImages={setImages}
          onError={text => setFlash({ type: 'error', text })}
        />
      )}
    </div>
  )
}

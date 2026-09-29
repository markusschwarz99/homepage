import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { api, assetUrl, errorText, uploadFile } from '../lib/api'
import type { GalleryImage } from '../lib/types'
import SortableList from './SortableList'
import { btnSecondary, inputClass } from './ui'

// Galerie-Änderungen werden sofort gespeichert (unabhängig vom Seiten-Formular).
export default function GalleryEditor({
  pageId,
  images,
  setImages,
  onError,
}: {
  pageId: number
  images: GalleryImage[]
  setImages: Dispatch<SetStateAction<GalleryImage[]>>
  onError: (message: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(0)

  async function addFiles(files: File[]) {
    setPending(files.length)
    for (const file of files) {
      try {
        const img = await uploadFile<GalleryImage>(`/hongar/pages/${pageId}/images`, file)
        setImages(prev => [...prev, img])
      } catch (err) {
        onError(`${file.name}: ${errorText(err)}`)
      }
      setPending(n => n - 1)
    }
  }

  async function reorder(ids: number[]) {
    const byId = new Map(images.map(i => [i.id, i]))
    const previous = images
    setImages(ids.map(id => byId.get(id)).filter((i): i is GalleryImage => !!i))
    try {
      await api(`/hongar/pages/${pageId}/images/reorder`, { method: 'PATCH', body: JSON.stringify({ ids }) })
    } catch (err) {
      setImages(previous)
      onError(`Reihenfolge nicht gespeichert: ${errorText(err)}`)
    }
  }

  async function remove(image: GalleryImage) {
    if (!window.confirm('Dieses Bild aus der Galerie entfernen?')) return
    try {
      await api(`/hongar/pages/${pageId}/images/${image.id}`, { method: 'DELETE' })
      setImages(prev => prev.filter(i => i.id !== image.id))
    } catch (err) {
      onError(errorText(err))
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-alm-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Galerie</h2>
          <p className="text-sm text-alm-muted">
            Bilder unter dem Text. Änderungen hier werden sofort gespeichert.
          </p>
        </div>
        <button
          type="button"
          className={btnSecondary}
          disabled={pending > 0}
          onClick={() => fileInput.current?.click()}
        >
          {pending > 0 ? `Lädt hoch … (${pending})` : '+ Bilder hinzufügen'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length > 0) void addFiles(files)
          }}
        />
      </div>

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-alm-muted">Noch keine Bilder.</p>
      ) : (
        <div className="mt-5">
          <SortableList
            items={images}
            onReorder={reorder}
            renderItem={(image, handle) => (
              <div className="flex items-center gap-3 rounded-xl border border-alm-line bg-alm-cream/40 p-2">
                {handle}
                <img src={assetUrl(image.url)} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                <CaptionInput
                  pageId={pageId}
                  image={image}
                  onSaved={updated => setImages(prev => prev.map(i => (i.id === updated.id ? updated : i)))}
                  onError={onError}
                />
                <button
                  type="button"
                  onClick={() => void remove(image)}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Entfernen
                </button>
              </div>
            )}
          />
        </div>
      )}
    </section>
  )
}

function CaptionInput({
  pageId,
  image,
  onSaved,
  onError,
}: {
  pageId: number
  image: GalleryImage
  onSaved: (image: GalleryImage) => void
  onError: (message: string) => void
}) {
  const [value, setValue] = useState(image.caption)

  async function commit() {
    if (value.trim() === image.caption) return
    try {
      const updated = await api<GalleryImage>(`/hongar/pages/${pageId}/images/${image.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption: value }),
      })
      onSaved(updated)
    } catch (err) {
      onError(errorText(err))
    }
  }

  return (
    <input
      value={value}
      maxLength={300}
      placeholder="Bildunterschrift (optional)"
      aria-label="Bildunterschrift"
      onChange={e => setValue(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`${inputClass} min-w-0 flex-1`}
    />
  )
}

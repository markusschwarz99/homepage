import { useCallback, useEffect, useRef, useState } from 'react'
import { assetUrl } from '../lib/api'
import type { GalleryImage } from '../lib/types'

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (images.length === 0) return null
  return (
    <>
      <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 ring-alm-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alm-forest"
          >
            <span className="block aspect-[4/3] overflow-hidden bg-alm-sand">
              <img
                src={assetUrl(img.url)}
                alt={img.caption}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </span>
            {img.caption && <span className="block px-3 py-2 text-sm text-alm-muted">{img.caption}</span>}
          </button>
        ))}
      </div>
      {open !== null && (
        <Lightbox images={images} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: GalleryImage[]
  index: number
  onChange: (index: number) => void
  onClose: () => void
}) {
  const count = images.length
  const prev = useCallback(() => onChange((index - 1 + count) % count), [index, count, onChange])
  const next = useCallback(() => onChange((index + 1) % count), [index, count, onChange])
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [prev, next, onClose])

  const img = images[index]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildergalerie"
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span>
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="rounded-full px-3 py-1 text-2xl leading-none hover:bg-white/10"
        >
          ×
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4"
        onTouchStart={e => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={e => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (dx > 50) prev()
          else if (dx < -50) next()
        }}
      >
        <img
          src={assetUrl(img.url)}
          alt={img.caption}
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={e => e.stopPropagation()}
        />
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Vorheriges Bild"
              onClick={e => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-3 text-3xl leading-none text-white hover:bg-black/60"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Nächstes Bild"
              onClick={e => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-3 text-3xl leading-none text-white hover:bg-black/60"
            >
              ›
            </button>
          </>
        )}
      </div>
      <p className="min-h-14 px-4 py-4 text-center text-white/90" onClick={e => e.stopPropagation()}>
        {img.caption}
      </p>
    </div>
  )
}

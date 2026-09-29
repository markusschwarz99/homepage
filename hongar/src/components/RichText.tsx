import DOMPurify from 'dompurify'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GpxMap = lazy(() => import('./GpxMap'))

const TONES = {
  light:
    'prose prose-stone max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:text-alm-wood prose-a:underline-offset-2 prose-img:rounded-xl',
  dark: 'prose prose-invert max-w-none prose-headings:font-display prose-a:text-alm-sand prose-a:underline-offset-2',
}

interface MapSlot {
  el: HTMLElement
  url: string
  label: string
}

// HTML aus dem CMS. Der Server säubert beim Speichern bereits (nh3),
// DOMPurify ist die zweite Verteidigungslinie beim Anzeigen.
export default function RichText({
  html,
  tone = 'light',
  className = '',
}: {
  html: string
  tone?: keyof typeof TONES
  className?: string
}) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  const ref = useRef<HTMLDivElement>(null)
  const [maps, setMaps] = useState<MapSlot[]>([])

  // Unter jedem Absatz mit Link auf eine eigene .gpx-Datei eine Karte des Tracks einhängen.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const slots = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href$=".gpx"]'))
      .filter(a => a.origin === window.location.origin)
      .map(a => {
        const el = document.createElement('div')
        el.className = 'not-prose'
        ;(a.closest('p, li') ?? a).after(el)
        return { el, url: a.href, label: a.textContent ?? '' }
      })
    if (slots.length === 0) return
    setMaps(slots)
    return () => {
      slots.forEach(s => s.el.remove())
      setMaps([])
    }
  }, [clean])

  return (
    <>
      <div ref={ref} className={`${TONES[tone]} ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
      {maps.map((m, i) =>
        createPortal(
          <Suspense fallback={<div className="my-4 h-72 animate-pulse rounded-xl bg-alm-sand md:h-96" />}>
            <GpxMap url={m.url} label={m.label} />
          </Suspense>,
          m.el,
          i,
        ),
      )}
    </>
  )
}

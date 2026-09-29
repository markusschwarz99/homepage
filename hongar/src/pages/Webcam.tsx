import { useEffect, useState } from 'react'
import { useSite } from '../lib/site'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { webcamUrls, withCacheBuster } from '../lib/webcam'

const REFRESH_MS = 60_000

export default function Webcam() {
  const { settings, loaded } = useSite()
  const urls = webcamUrls(settings.webcam_urls)
  const [tick, setTick] = useState(() => Date.now())
  useDocumentTitle('Webcam')

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Webcam</h1>
      <p className="mt-3 text-alm-muted">Das Bild wird jede Minute automatisch aktualisiert.</p>

      {loaded && urls.length === 0 && <p className="mt-10 text-alm-muted">Derzeit ist keine Webcam eingerichtet.</p>}

      <div className={`mt-10 grid gap-6 ${urls.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {urls.map((url, i) => (
          <figure key={url} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-alm-line">
            <a href={url} target="_blank" rel="noopener noreferrer" title="In voller Größe öffnen">
              <img
                src={withCacheBuster(url, tick)}
                alt={`Webcam ${i + 1}`}
                referrerPolicy="no-referrer"
                className="w-full bg-alm-sand"
              />
            </a>
            {urls.length > 1 && <figcaption className="px-4 py-3 text-sm text-alm-muted">Webcam {i + 1}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  )
}

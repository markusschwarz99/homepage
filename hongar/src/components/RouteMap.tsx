import { lazy, Suspense, useState } from 'react'

// Leaflet + Karte erst laden, wenn sie gebraucht wird.
const RouteMapCanvas = lazy(() => import('./RouteMapCanvas'))

const CONSENT_KEY = 'hongar_map_consent'

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

// Karte der Wanderrouten. Kartenkacheln kommen von basemap.at – deshalb lädt
// die Karte erst nach einem Klick (keine IP-Übertragung an Dritte ohne Zutun).
export default function RouteMap({ files }: { files: string[] }) {
  const [enabled, setEnabled] = useState(hasConsent)

  function enable() {
    try {
      localStorage.setItem(CONSENT_KEY, '1')
    } catch {
      // gilt dann nur für diesen Besuch
    }
    setEnabled(true)
  }

  return (
    <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6" aria-labelledby="routen-karte">
      <h2 id="routen-karte" className="font-display text-2xl font-semibold">
        Routen auf der Karte
      </h2>
      <div className="mt-4">
        {enabled ? (
          <Suspense fallback={<div className="h-[60vh] max-h-[520px] min-h-80 animate-pulse rounded-2xl bg-alm-sand" />}>
            <RouteMapCanvas files={files} />
          </Suspense>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-2xl bg-alm-sand px-6 text-center ring-1 ring-alm-line">
            <p className="max-w-md text-sm text-alm-muted">
              Die Karte wird von basemap.at geladen. Dabei wird deine IP-Adresse an den Kartendienst übertragen.
            </p>
            <button
              type="button"
              onClick={enable}
              className="rounded-lg bg-alm-forest px-4 py-2 font-semibold text-white hover:bg-alm-forest-dark"
            >
              Karte laden
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

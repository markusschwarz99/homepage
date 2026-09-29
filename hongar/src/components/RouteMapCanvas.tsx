import 'leaflet/dist/leaflet.css'
import { circleMarker, latLngBounds, map as createMap, polyline, tileLayer } from 'leaflet'
import type { LatLngBounds, Map as LeafletMap } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { parseGpx } from '../lib/gpx'
import type { Track } from '../lib/gpx'

const TILE_URL = 'https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png'
const ATTRIBUTION =
  'Grundkarte: <a href="https://basemap.at" target="_blank" rel="noopener noreferrer">basemap.at</a>'
// Kräftige Farben, die sich von der Grundkarte und voneinander abheben
const COLORS = ['#c2410c', '#1d4ed8', '#7e22ce', '#be123c', '#0f766e', '#a16207']
const FIT = { padding: [24, 24] as [number, number] }

const color = (index: number) => COLORS[index % COLORS.length]

export default function RouteMapCanvas({ files }: { files: string[] }) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const allBounds = useRef<LatLngBounds | null>(null)
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      files.map(async file => {
        const res = await fetch(file)
        if (!res.ok) throw new Error(`${file}: ${res.status}`)
        return parseGpx(file, await res.text())
      }),
    )
      .then(result => {
        if (!cancelled) setTracks(result.filter(t => t.points.length > 1))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [files])

  useEffect(() => {
    if (!container.current || !tracks || tracks.length === 0) return
    const m = createMap(container.current, { scrollWheelZoom: false })
    tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m)
    const bounds = latLngBounds([])
    tracks.forEach((track, i) => {
      const line = polyline(track.points, { color: color(i), weight: 4, opacity: 0.9 })
      line.bindTooltip(track.name, { sticky: true }).addTo(m)
      circleMarker(track.points[0], { radius: 6, color: '#ffffff', weight: 2, fillColor: color(i), fillOpacity: 1 })
        .bindTooltip(`Start: ${track.name}`)
        .addTo(m)
      bounds.extend(line.getBounds())
    })
    m.fitBounds(bounds, FIT)
    mapRef.current = m
    allBounds.current = bounds
    return () => {
      m.remove()
      mapRef.current = null
    }
  }, [tracks])

  const showAll = () => allBounds.current && mapRef.current?.fitBounds(allBounds.current, FIT)
  const focus = (track: Track) => mapRef.current?.fitBounds(latLngBounds(track.points), FIT)

  if (failed) {
    return <p className="rounded-2xl bg-alm-sand p-6 text-alm-muted">Die Routen konnten nicht geladen werden.</p>
  }

  return (
    <div>
      {/* isolate: Leaflets z-index-Werte sollen nicht über den festen Header ragen */}
      <div
        ref={container}
        role="region"
        aria-label="Karte der Wanderrouten"
        className="isolate h-[60vh] max-h-[520px] min-h-80 w-full overflow-hidden rounded-2xl bg-alm-sand ring-1 ring-alm-line"
      />
      {tracks && tracks.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Routen">
          <li>
            <button
              type="button"
              onClick={showAll}
              className="rounded-full border border-alm-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-alm-sand"
            >
              Alle Routen
            </button>
          </li>
          {tracks.map((track, i) => (
            <li key={track.file}>
              <button
                type="button"
                onClick={() => focus(track)}
                className="inline-flex items-center gap-2 rounded-full border border-alm-line bg-white px-3 py-1.5 text-sm hover:bg-alm-sand"
              >
                <span aria-hidden="true" className="h-1.5 w-5 rounded-full" style={{ backgroundColor: color(i) }} />
                {track.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

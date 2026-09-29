import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { HONGAR_LATLNG, SITE_NAME } from '../config'

// Karte zu einer GPX-Datei (wird per lazy() nachgeladen, damit Leaflet nur auf
// Seiten mit GPX-Link im Bundle landet).
export default function GpxMap({ url, label }: { url: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Auf dem Handy: Seite scrollt mit einem Finger weiter, Karte per Pinch/Buttons.
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    let cancelled = false
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then(text => {
        if (cancelled) return
        const doc = new DOMParser().parseFromString(text, 'application/xml')
        const points = Array.from(doc.querySelectorAll('trkpt, rtept'))
          .map(p => [Number(p.getAttribute('lat')), Number(p.getAttribute('lon'))] as [number, number])
          .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))
        if (points.length === 0) throw new Error('keine Trackpunkte')

        const track = L.polyline(points, { color: '#8a5a36', weight: 4, opacity: 0.9 }).addTo(map)
        const ends = { radius: 6, color: '#fff', weight: 2, fillColor: '#2f4a3a', fillOpacity: 1 }
        L.circleMarker(points[0], ends).addTo(map)
        L.circleMarker(points[points.length - 1], ends).addTo(map)
        L.circleMarker(HONGAR_LATLNG, { ...ends, radius: 8, fillColor: '#8a5a36' })
          .bindTooltip(SITE_NAME)
          .addTo(map)
        map.fitBounds(track.getBounds(), { padding: [24, 24] })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      map.remove()
    }
  }, [url])

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`Karte: ${label}`}
      className={`relative z-0 my-4 h-72 overflow-hidden rounded-xl ring-1 ring-alm-line md:h-96 ${failed ? 'hidden' : ''}`}
    />
  )
}

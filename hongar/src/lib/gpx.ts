export interface Track {
  file: string
  name: string
  points: [number, number][]
}

// GPX-Links im Seitentext (z.B. /gpx/aurach.gpx), ohne Duplikate, in Reihenfolge.
export function gpxLinks(html: string): string[] {
  const files = [...html.matchAll(/href="(\/gpx\/[\w.-]+\.gpx)"/g)].map(m => m[1])
  return [...new Set(files)]
}

export function parseGpx(file: string, xml: string): Track {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const trackName = doc.getElementsByTagName('trk')[0]?.getElementsByTagName('name')[0]?.textContent
  const points = Array.from(doc.getElementsByTagName('trkpt'))
    .map(pt => [Number(pt.getAttribute('lat')), Number(pt.getAttribute('lon'))] as [number, number])
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))
  return { file, name: trackName?.trim() || file, points }
}

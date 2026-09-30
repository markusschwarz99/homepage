import type { CarRole, Person, Place } from './types'

export function personName(p: Person): string {
  return `${p.display_name ?? p.first_name} ${p.last_name}`
}

export function firstName(p: Person): string {
  return p.display_name ?? p.first_name
}

export const ROLE_LABEL: Record<CarRole, string> = {
  driver: 'Fahrer:in',
  co_driver: 'Zweitfahrer:in',
  passenger: 'Mitfahrend',
}

const ROLE_ORDER: Record<CarRole, number> = { driver: 0, co_driver: 1, passenger: 2 }

export function byRole(a: Person, b: Person): number {
  return ROLE_ORDER[a.car_role ?? 'passenger'] - ROLE_ORDER[b.car_role ?? 'passenger']
}

export function mapsUrl(place: Place): string {
  if (place.url) return place.url
  const query = [place.name, place.address ?? 'Teneriffa'].join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

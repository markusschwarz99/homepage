// Spiegelt retreat/backend/schemas.py

export type CarKind = 'car' | 'taxi'
export type CarRole = 'driver' | 'co_driver' | 'passenger'
export type Category = 'meal' | 'work' | 'activity' | 'travel'

export interface Place {
  id: string
  name: string
  address: string | null
  phone: string | null
  distance: string | null
  url: string | null
}

export interface RetreatEvent {
  start: string // lokale Zeit TFS, "2026-10-19T07:00"
  end: string
  title: string
  category: Category
  place: string | null
  note: string | null
}

export interface Activity {
  day: string // "2026-10-19"
  title: string
  details: string | null
  participants: string | null
  place: string | null
  url: string | null
}

export interface Content {
  info: {
    title: string
    location: string
    accommodation: string | null
    core_hours: string | null
    note: string | null
  }
  places: Place[]
  events: RetreatEvent[]
  activities: Activity[]
}

export interface Person {
  id: number
  first_name: string
  last_name: string
  display_name: string | null
  is_orga: boolean
  car_id: number | null
  car_role: CarRole | null
  apartment_id: number | null
}

export interface Car {
  id: number
  name: string
  kind: CarKind
  seats: number
}

export interface Apartment {
  id: number
  number: string | null
  name: string
  rooms_label: string | null
  capacity: number
}

export interface RetreatState {
  me: Person
  people: Person[]
  cars: Car[]
  apartments: Apartment[]
  content: Content
}

export type PersonUpdate = Partial<Pick<Person, 'car_id' | 'car_role' | 'apartment_id'>>

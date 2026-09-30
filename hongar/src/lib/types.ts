export interface SiteSettings {
  opening_hours: string
  news: string
  contact: string
  facebook_url: string
  booking_url: string
  webcam_urls: string
}

export interface HongarEvent {
  id: number
  event_date: string // YYYY-MM-DD
  time_label: string
  title: string
  description: string
}

export interface User {
  id: number
  name: string
  email: string
  role: string
}

export interface HongarClosure {
  id: number
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD, inklusive
  note: string
}

export interface NavPage {
  id: number
  slug: string
  title: string
  parent_id: number | null
  position: number
  show_in_nav: boolean
  is_published: boolean
  cover_image_url: string | null
}

export interface GalleryImage {
  id: number
  url: string
  caption: string
  position: number
}

export interface FullPage extends NavPage {
  content_html: string
  cover_image: string | null
  images: GalleryImage[]
  updated_at: string | null
}

export interface SiteSettings {
  opening_hours: string
  news: string
  contact: string
  facebook_url: string
  booking_url: string
  webcam_urls: string
}

export interface User {
  id: number
  name: string
  email: string
  role: string
}

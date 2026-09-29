import { START_SLUG } from '../config'
import type { ContentPage } from './content'

export interface NavLinkItem {
  key: string
  title: string
  to: string
}

export interface NavEntry extends NavLinkItem {
  children: NavLinkItem[]
}

export function pagePath(slug: string): string {
  return slug === START_SLUG ? '/' : `/${slug}`
}

function inNav(page: ContentPage): boolean {
  return page.nav !== false && page.slug !== START_SLUG
}

export function childPages(pages: ContentPage[], slug: string): ContentPage[] {
  return pages.filter(p => p.parent === slug && inNav(p))
}

// Hauptmenü: Seiten (eine Ebene Unterseiten) + feste Webcam-Seite,
// die vor "Kontakt" einsortiert wird (falls es die Seite gibt).
export function buildNav(pages: ContentPage[], hasWebcam: boolean): NavEntry[] {
  const entries: NavEntry[] = pages
    .filter(p => !p.parent && inNav(p))
    .map(top => ({
      key: top.slug,
      title: top.title,
      to: pagePath(top.slug),
      children: childPages(pages, top.slug).map(c => ({ key: c.slug, title: c.title, to: pagePath(c.slug) })),
    }))
  if (hasWebcam) {
    const kontakt = entries.findIndex(e => e.to === '/kontakt')
    entries.splice(kontakt >= 0 ? kontakt : entries.length, 0, {
      key: 'webcam',
      title: 'Webcam',
      to: '/webcam',
      children: [],
    })
  }
  return entries
}

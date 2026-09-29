import { START_SLUG } from '../config'
import type { NavPage } from './types'

export interface NavLinkItem {
  key: string
  title: string
  to: string
}

export interface NavEntry extends NavLinkItem {
  children: NavLinkItem[]
}

function visiblePages(pages: NavPage[]): NavPage[] {
  return pages.filter(p => p.show_in_nav && p.slug !== START_SLUG)
}

export function topLevelPages(pages: NavPage[]): NavPage[] {
  return visiblePages(pages).filter(p => p.parent_id === null)
}

export function childPages(pages: NavPage[], parentId: number): NavPage[] {
  return visiblePages(pages).filter(p => p.parent_id === parentId)
}

export function pagePath(slug: string): string {
  return slug === START_SLUG ? '/' : `/${slug}`
}

// Hauptmenü: CMS-Seiten (eine Ebene Unterseiten) + feste Webcam-Seite,
// die vor "Kontakt" einsortiert wird (falls es die Seite gibt).
export function buildNav(pages: NavPage[], hasWebcam: boolean): NavEntry[] {
  const entries: NavEntry[] = topLevelPages(pages).map(top => ({
    key: `page-${top.id}`,
    title: top.title,
    to: pagePath(top.slug),
    children: childPages(pages, top.id).map(c => ({
      key: `page-${c.id}`,
      title: c.title,
      to: pagePath(c.slug),
    })),
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

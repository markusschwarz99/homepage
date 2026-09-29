// Seiteninhalte der Website. Die Texte kommen als JSON aus der API
// (GET /hongar/content, gepflegt per backend/scripts/hongar_content.py) und
// liegen bewusst nicht im Repo. Gestaltet werden sie hier im Code über
// Block-Bausteine (components/blocks.tsx).
//
// In allen Fließtexten markiert **so** eine Hervorhebung.

export interface Img {
  /** "/img/…" (Beispielbild, liegt in hongar/public) oder "/uploads/…" (hochgeladen) */
  src: string
  alt: string
  caption?: string
}

export interface LinkItem {
  label: string
  /** "/seite" (intern), "https://…", "tel:…" oder "mailto:…" */
  href: string
}

export interface IconItem {
  icon?: string
  title: string
  text?: string
  link?: LinkItem
}

export type Block =
  /** Überschrift + Absätze, schmale Spalte */
  | { type: 'text'; eyebrow?: string; title?: string; lead?: string; text?: string[]; link?: LinkItem }
  /** Bild neben Text */
  | {
      type: 'split'
      eyebrow?: string
      title: string
      text?: string[]
      items?: string[]
      image: Img
      reverse?: boolean
      link?: LinkItem
    }
  /** Große Zahlen/Fakten */
  | { type: 'stats'; title?: string; items: { icon?: string; value: string; label: string }[] }
  /** Kacheln mit Icon */
  | { type: 'features'; eyebrow?: string; title?: string; lead?: string; items: IconItem[] }
  /** Eine oder mehrere Listen nebeneinander (z.B. Speisen | Getränke) */
  | {
      type: 'lists'
      eyebrow?: string
      title?: string
      lead?: string
      columns: { icon?: string; title?: string; items: string[] }[]
      note?: string
    }
  /** Hervorgehobener Hinweis-Kasten */
  | {
      type: 'notice'
      tone?: 'info' | 'warning'
      icon?: string
      title: string
      text?: string[]
      items?: string[]
      footer?: string
    }
  /** Zeitleiste (Geschichte) */
  | { type: 'timeline'; eyebrow?: string; title?: string; items: { year: string; title?: string; text: string }[] }
  /** Partner/Lieferanten */
  | {
      type: 'partners'
      eyebrow?: string
      title?: string
      lead?: string
      items: { name: string; place?: string; products: string; url?: string; icon?: string }[]
      note?: string
    }
  /** Wanderrouten mit GPX-Karte */
  | {
      type: 'routes'
      eyebrow?: string
      title?: string
      lead?: string
      items: {
        title: string
        text: string
        duration?: string
        distance?: string
        up?: string
        down?: string
        gpx?: string
      }[]
    }
  /** Aufruf mit Button */
  | { type: 'cta'; title: string; text?: string; link: LinkItem; image?: Img }
  /** Bildergalerie mit Lightbox */
  | { type: 'gallery'; title?: string; images: Img[] }
  /** Zitat / Gruß */
  | { type: 'quote'; text: string; author?: string }
  /** Freier HTML-Text (Rechtstexte) */
  | { type: 'html'; html: string }
  // ---- dynamische Bausteine (Daten aus Redaktion/Code) ----
  /** Aktuelles + Öffnungszeiten (Redaktion) */
  | { type: 'info' }
  /** Kommende Veranstaltungen (Redaktion) */
  | { type: 'events'; eyebrow?: string; title?: string; lead?: string; limit?: number; link?: LinkItem }
  /** Kacheln zu anderen Seiten; ohne slugs: Unterseiten der aktuellen Seite */
  | { type: 'teasers'; eyebrow?: string; title?: string; slugs?: string[] }
  /** Aktuelles Webcam-Bild */
  | { type: 'webcam'; title?: string; text?: string }
  /** Kontakt (Redaktion) + Öffnungszeiten + Karte */
  | { type: 'contact'; title?: string; mapUrl?: string; text?: string[] }
  /** Bildnachweis der Beispielbilder */
  | { type: 'credits'; title?: string }

export interface ContentPage {
  slug: string
  title: string
  /** slug der übergeordneten Seite (eine Ebene) */
  parent?: string
  /** false = nicht im Menü (z.B. Impressum) */
  nav?: boolean
  hero?: { image?: Img; eyebrow?: string; lead?: string; title?: string }
  /** Kurztext für Kacheln, die auf diese Seite zeigen */
  teaser?: string
  blocks: Block[]
}

export interface SiteContent {
  pages: ContentPage[]
}

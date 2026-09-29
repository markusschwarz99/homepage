import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Gallery from '../components/Gallery'
import Hero from '../components/Hero'
import RichText from '../components/RichText'
import TeaserGrid from '../components/TeaserGrid'
import { SITE_NAME, START_SLUG } from '../config'
import { api } from '../lib/api'
import { isEditor, useAuth } from '../lib/auth'
import { topLevelPages } from '../lib/nav'
import { useSite } from '../lib/site'
import type { FullPage } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { webcamUrls, withCacheBuster } from '../lib/webcam'

export default function Home() {
  const { pages, settings, loaded } = useSite()
  const { user } = useAuth()
  const [start, setStart] = useState<FullPage | null>(null)
  const hasStart = pages.some(p => p.slug === START_SLUG)
  useDocumentTitle()

  useEffect(() => {
    if (!hasStart) return
    api<FullPage>(`/hongar/pages/${START_SLUG}`)
      .then(setStart)
      .catch(() => setStart(null))
  }, [hasStart])

  const teasers = topLevelPages(pages)
  const webcam = webcamUrls(settings.webcam_urls)[0]
  const infoCards = [
    settings.news && { title: 'Aktuelles', html: settings.news, highlight: true },
    settings.opening_hours && { title: 'Öffnungszeiten', html: settings.opening_hours, highlight: false },
  ].filter((c): c is { title: string; html: string; highlight: boolean } => !!c)

  return (
    <>
      <Hero
        title={start?.title ?? SITE_NAME}
        eyebrow={start ? SITE_NAME : undefined}
        image={start?.cover_image_url}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {infoCards.length > 0 && (
          <section className={`relative z-10 -mt-12 grid gap-4 ${infoCards.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {infoCards.map(card => (
              <div
                key={card.title}
                className={`rounded-2xl p-6 shadow-lg ring-1 ${card.highlight ? 'bg-alm-wood text-white ring-alm-wood' : 'bg-white ring-alm-line'}`}
              >
                <h2 className="font-display text-xl font-semibold">{card.title}</h2>
                <RichText html={card.html} tone={card.highlight ? 'dark' : 'light'} className="mt-3" />
              </div>
            ))}
          </section>
        )}

        {start?.content_html && (
          <section className="mx-auto mt-14 max-w-3xl">
            <RichText html={start.content_html} className="md:prose-lg" />
          </section>
        )}

        {start && start.images.length > 0 && (
          <section className="mt-12">
            <Gallery images={start.images} />
          </section>
        )}

        {teasers.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-3xl font-semibold">Entdecken</h2>
            <div className="mt-6">
              <TeaserGrid pages={teasers} />
            </div>
          </section>
        )}

        {webcam && (
          <section className="mt-20 overflow-hidden rounded-2xl bg-alm-forest text-alm-cream shadow-lg md:grid md:grid-cols-2">
            <img
              src={withCacheBuster(webcam, Date.now())}
              alt="Aktuelles Webcam-Bild"
              referrerPolicy="no-referrer"
              className="aspect-video h-full w-full object-cover object-left"
            />
            <div className="flex flex-col justify-center gap-4 p-8">
              <h2 className="font-display text-2xl font-semibold">Wie schaut's heute aus?</h2>
              <p className="text-alm-cream/80">Ein Blick auf die Webcam zeigt das aktuelle Wetter.</p>
              <Link to="/webcam" className="font-semibold text-alm-sand hover:underline">
                Zur Webcam →
              </Link>
            </div>
          </section>
        )}

        {loaded && !hasStart && isEditor(user) && (
          <p className="mt-12 rounded-xl border border-dashed border-alm-line bg-white p-6 text-alm-muted">
            Noch keine Startseite veröffentlicht. Lege in der{' '}
            <Link to="/admin" className="font-semibold text-alm-wood hover:underline">
              Verwaltung
            </Link>{' '}
            eine Seite mit dem Kürzel „{START_SLUG}“ an – ihr Titelbild, Titel und Text erscheinen dann hier.
          </p>
        )}
      </div>
    </>
  )
}

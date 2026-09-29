import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Gallery from '../components/Gallery'
import Hero from '../components/Hero'
import RichText from '../components/RichText'
import RouteMap from '../components/RouteMap'
import TeaserGrid from '../components/TeaserGrid'
import { START_SLUG } from '../config'
import { ApiError, api } from '../lib/api'
import { gpxLinks } from '../lib/gpx'
import { isEditor, useAuth } from '../lib/auth'
import { childPages, pagePath } from '../lib/nav'
import { useSite } from '../lib/site'
import type { FullPage } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import NotFound from './NotFound'

type LoadState = 'loading' | 'ok' | 'notfound' | 'error'

export default function PageView() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { pages } = useSite()
  const [page, setPage] = useState<FullPage | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  useDocumentTitle(state === 'ok' ? page?.title : undefined)

  useEffect(() => {
    if (slug === START_SLUG) return
    let cancelled = false
    setState('loading')
    api<FullPage>(`/hongar/pages/${encodeURIComponent(slug)}`)
      .then(p => {
        if (cancelled) return
        setPage(p)
        setState('ok')
      })
      .catch((err: unknown) => {
        if (!cancelled) setState(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // GPX-Links im Text -> Routenkarte unter dem Text
  const gpxFiles = useMemo(() => (page ? gpxLinks(page.content_html) : []), [page])

  if (slug === START_SLUG) return <Navigate to="/" replace />
  if (state === 'notfound') return <NotFound />
  if (state === 'error') {
    return (
      <p className="mx-auto max-w-3xl px-4 py-24 text-center text-alm-muted">
        Die Seite konnte nicht geladen werden. Bitte später noch einmal versuchen.
      </p>
    )
  }
  if (state === 'loading' || !page) {
    return <div className="min-h-[34vh] animate-pulse bg-alm-sand md:min-h-[42vh]" aria-busy="true" />
  }

  const parent = page.parent_id !== null ? pages.find(p => p.id === page.parent_id) : undefined
  const children = childPages(pages, page.id)

  return (
    <article>
      <Hero
        size="md"
        title={page.title}
        image={page.cover_image_url}
        eyebrow={
          parent ? (
            <Link to={pagePath(parent.slug)} className="hover:underline">
              {parent.title}
            </Link>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        {isEditor(user) && (
          <Link
            to={`/admin/seiten/${page.id}`}
            className="mb-8 inline-flex items-center gap-2 rounded-lg border border-alm-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-alm-sand"
          >
            ✎ Seite bearbeiten
          </Link>
        )}
        {page.content_html && <RichText html={page.content_html} className="md:prose-lg" />}
      </div>

      {gpxFiles.length > 0 && <RouteMap files={gpxFiles} />}

      {page.images.length > 0 && (
        <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <Gallery images={page.images} />
        </div>
      )}

      {children.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <TeaserGrid pages={children} />
        </section>
      )}
    </article>
  )
}

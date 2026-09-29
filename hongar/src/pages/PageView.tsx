import { Link, Navigate, useParams } from 'react-router-dom'
import Blocks from '../components/blocks'
import Hero from '../components/Hero'
import { START_SLUG } from '../config'
import { pagePath } from '../lib/nav'
import { useSite } from '../lib/site'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import NotFound from './NotFound'

export default function PageView() {
  const { slug = '' } = useParams()
  const { content, loaded } = useSite()
  const page = content.pages.find(p => p.slug === slug)
  useDocumentTitle(page?.title)

  if (slug === START_SLUG) return <Navigate to="/" replace />
  if (!loaded) return <div className="min-h-[34vh] animate-pulse bg-alm-sand md:min-h-[42vh]" aria-busy="true" />
  if (!page) return <NotFound />

  const parent = page.parent ? content.pages.find(p => p.slug === page.parent) : undefined

  return (
    <article>
      <Hero
        size="md"
        title={page.hero?.title ?? page.title}
        lead={page.hero?.lead}
        image={page.hero?.image?.src}
        eyebrow={
          parent ? (
            <Link to={pagePath(parent.slug)} className="hover:underline">
              {parent.title}
            </Link>
          ) : (
            page.hero?.eyebrow
          )
        }
      />
      <Blocks page={page} />
    </article>
  )
}

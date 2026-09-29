import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { assetUrl } from '../lib/api'
import type { ContentPage } from '../lib/content'
import { pagePath } from '../lib/nav'
import Mountains from './Mountains'

export default function TeaserGrid({ pages }: { pages: ContentPage[] }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-2 ${pages.length === 4 ? 'lg:grid-cols-4' : pages.length === 2 ? '' : 'lg:grid-cols-3'}`}>
      {pages.map(page => {
        const image = page.hero?.image
        return (
          <Link
            key={page.slug}
            to={pagePath(page.slug)}
            className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-alm-line transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alm-forest"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-alm-forest">
              {image ? (
                <img
                  src={assetUrl(image.src)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <Mountains className="absolute inset-x-0 bottom-0 h-2/3 w-full text-alm-forest-dark" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h3 className="flex items-center justify-between gap-3 font-display text-xl font-semibold">
                {page.title}
                <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-alm-wood transition group-hover:translate-x-1" />
              </h3>
              {page.teaser && <p className="text-alm-muted">{page.teaser}</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { assetUrl } from '../lib/api'
import { pagePath } from '../lib/nav'
import type { NavPage } from '../lib/types'
import Mountains from './Mountains'

export default function TeaserGrid({ pages }: { pages: NavPage[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map(page => (
        <Link
          key={page.id}
          to={pagePath(page.slug)}
          className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-alm-line transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alm-forest"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-alm-forest">
            {page.cover_image_url ? (
              <img
                src={assetUrl(page.cover_image_url)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <Mountains className="absolute inset-x-0 bottom-0 h-2/3 w-full text-alm-forest-dark" />
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-5">
            <h3 className="font-display text-xl font-semibold">{page.title}</h3>
            <span aria-hidden="true" className="text-alm-wood transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

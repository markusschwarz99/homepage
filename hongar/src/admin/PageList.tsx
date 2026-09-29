import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { START_SLUG } from '../config'
import { api, errorText } from '../lib/api'
import { pagePath } from '../lib/nav'
import { useSite } from '../lib/site'
import type { NavPage } from '../lib/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import SortableList from './SortableList'
import { Flash, btnPrimary } from './ui'
import type { FlashMessage } from './ui'

function applyOrder(pages: NavPage[], ids: number[]): NavPage[] {
  const position = new Map(ids.map((id, index) => [id, index]))
  return pages
    .map(p => (position.has(p.id) ? { ...p, position: position.get(p.id) ?? p.position } : p))
    .sort((a, b) => a.position - b.position || a.id - b.id)
}

export default function PageList() {
  const location = useLocation()
  const { reload: reloadSite } = useSite()
  const [pages, setPages] = useState<NavPage[] | null>(null)
  const [flash, setFlash] = useState<FlashMessage | null>(() => {
    const text = (location.state as { flash?: string } | null)?.flash
    return text ? { type: 'success', text } : null
  })
  useDocumentTitle('Verwaltung')

  const load = useCallback(() => {
    api<NavPage[]>('/hongar/admin/pages')
      .then(setPages)
      .catch(err => setFlash({ type: 'error', text: errorText(err) }))
  }, [])

  useEffect(load, [load])

  async function reorder(ids: number[]) {
    setPages(prev => prev && applyOrder(prev, ids))
    try {
      await api('/hongar/pages/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) })
      reloadSite()
    } catch (err) {
      setFlash({ type: 'error', text: `Reihenfolge nicht gespeichert: ${errorText(err)}` })
      load()
    }
  }

  const tops = pages?.filter(p => p.parent_id === null) ?? []
  const childrenOf = (id: number) => pages?.filter(p => p.parent_id === id) ?? []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Seiten</h1>
        <Link to="/admin/seiten/neu" className={btnPrimary}>
          + Neue Seite
        </Link>
      </div>
      <p className="mt-2 text-sm text-alm-muted">
        Reihenfolge ändern: am Griff ⋮⋮ ziehen. Die Seite mit dem Kürzel „{START_SLUG}“ ist die Startseite.
      </p>

      <div className="mt-6">
        <Flash flash={flash} onClose={() => setFlash(null)} />
        {pages === null && !flash && <p className="text-alm-muted">Wird geladen …</p>}
        {pages?.length === 0 && (
          <p className="rounded-xl border border-dashed border-alm-line bg-white p-6 text-alm-muted">
            Noch keine Seiten. Leg mit „Neue Seite“ los – am besten zuerst die Startseite (Kürzel „{START_SLUG}“).
          </p>
        )}
        <SortableList
          items={tops}
          onReorder={reorder}
          renderItem={(page, handle) => (
            <div className="rounded-xl border border-alm-line bg-white">
              <PageRow page={page} handle={handle} />
              {childrenOf(page.id).length > 0 && (
                <div className="border-t border-alm-line py-2 pl-8 pr-2">
                  <SortableList
                    items={childrenOf(page.id)}
                    onReorder={reorder}
                    className="space-y-1"
                    renderItem={(child, childHandle) => <PageRow page={child} handle={childHandle} />}
                  />
                </div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}

function PageRow({ page, handle }: { page: NavPage; handle: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      {handle}
      <div className="min-w-0 flex-1">
        <Link to={`/admin/seiten/${page.id}`} className="font-semibold hover:text-alm-forest hover:underline">
          {page.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-alm-muted">
          <span>/{page.slug}</span>
          {page.slug === START_SLUG && <Badge className="bg-alm-forest/10 text-alm-forest">Startseite</Badge>}
          {page.is_published ? (
            <Badge className="bg-emerald-100 text-emerald-800">Veröffentlicht</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-900">Entwurf</Badge>
          )}
          {!page.show_in_nav && <Badge className="bg-alm-sand text-alm-muted">nicht im Menü</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {page.is_published && (
          <Link to={pagePath(page.slug)} className="text-alm-muted hover:text-alm-stone hover:underline">
            Ansehen
          </Link>
        )}
        <Link to={`/admin/seiten/${page.id}`} className="font-semibold text-alm-wood hover:underline">
          Bearbeiten
        </Link>
      </div>
    </div>
  )
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${className}`}>{children}</span>
}

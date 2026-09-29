import type { ReactNode } from 'react'
import { assetUrl } from '../lib/api'
import Mountains from './Mountains'

export default function Hero({
  title,
  eyebrow,
  lead,
  image,
  size = 'lg',
}: {
  title: string
  eyebrow?: ReactNode
  lead?: string
  image?: string | null
  size?: 'lg' | 'md'
}) {
  const height = size === 'lg' ? 'min-h-[62vh] md:min-h-[70vh]' : 'min-h-[34vh] md:min-h-[42vh]'
  const src = assetUrl(image)
  return (
    <section className={`relative flex items-end overflow-hidden bg-alm-forest ${height}`}>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Mountains className="absolute inset-x-0 bottom-0 h-1/2 w-full text-alm-forest-dark" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-black/5" />
      <div className={`relative mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 ${size === 'lg' ? 'pb-20' : 'pb-10'}`}>
        {eyebrow && (
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-alm-sand">{eyebrow}</div>
        )}
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-white drop-shadow sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-white/90 drop-shadow md:text-xl">{lead}</p>}
      </div>
    </section>
  )
}

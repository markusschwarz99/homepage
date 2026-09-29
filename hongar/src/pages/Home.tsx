import Blocks from '../components/blocks'
import Hero from '../components/Hero'
import { SITE_NAME, START_SLUG } from '../config'
import { isEditor, useAuth } from '../lib/auth'
import { useSite } from '../lib/site'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Home() {
  const { content, loaded } = useSite()
  const { user } = useAuth()
  const start = content.pages.find(p => p.slug === START_SLUG)
  useDocumentTitle()

  return (
    <>
      <Hero
        title={start?.hero?.title ?? start?.title ?? SITE_NAME}
        eyebrow={start?.hero?.eyebrow}
        lead={start?.hero?.lead}
        image={start?.hero?.image?.src}
      />
      {start && <Blocks page={start} />}
      {loaded && !start && isEditor(user) && (
        <p className="mx-auto mt-12 max-w-3xl rounded-xl border border-dashed border-alm-line bg-white p-6 text-alm-muted">
          Noch keine Seiteninhalte geladen. Die Texte werden mit <code>backend/scripts/hongar_content.py</code> in
          die Datenbank gespielt (Seite mit dem Kürzel „{START_SLUG}“ = Startseite).
        </p>
      )}
    </>
  )
}

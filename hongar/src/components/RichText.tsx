import DOMPurify from 'dompurify'
import { useMemo } from 'react'

const TONES = {
  light:
    'prose prose-stone max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:text-alm-wood prose-a:underline-offset-2 prose-img:rounded-xl',
  dark: 'prose prose-invert max-w-none prose-headings:font-display prose-a:text-alm-sand prose-a:underline-offset-2',
}

// HTML aus der Redaktion bzw. den Rechtstexten. Der Server säubert
// Redaktions-Texte beim Speichern bereits (nh3), DOMPurify ist die zweite
// Verteidigungslinie beim Anzeigen.
export default function RichText({
  html,
  tone = 'light',
  className = '',
}: {
  html: string
  tone?: keyof typeof TONES
  className?: string
}) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  return <div className={`${TONES[tone]} ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
}

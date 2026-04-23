/**
 * Konvertiert HTML zu reinem Text und kürzt auf maxLength Zeichen.
 * Für Teaser / Vorschauen in Übersichtslisten.
 */
export function htmlToExcerpt(html: string, maxLength = 160): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // textContent fügt an Block-Element-Grenzen automatisch Leerzeichen ein,
  // aber DOMParser macht das je nach Browser unterschiedlich. Sicherstellen
  // durch manuelles Trennen per querySelectorAll auf Block-Elemente.
  const blocks = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, li, div, br');
  blocks.forEach(el => el.insertAdjacentText('afterend', ' '));
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

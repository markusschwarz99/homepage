// Bildmarke: Berg + Almhütte (gleiches Motiv wie das Favicon).
export default function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2f4a3a" />
      <path d="M6 50 L24 22 L33 35 L40 26 L58 50 Z" fill="#f7f3ea" />
      <path d="M36 50 V41 L43 35 L50 41 V50 Z" fill="#8a5a36" />
      <rect x="41" y="44" width="4" height="6" fill="#f7f3ea" />
    </svg>
  )
}

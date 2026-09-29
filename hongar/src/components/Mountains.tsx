// Dekorative Bergsilhouette für Bereiche ohne Foto.
export default function Mountains({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M0 320 L0 210 L160 120 L270 190 L420 70 L560 170 L700 110 L860 200 L1010 90 L1150 180 L1290 130 L1440 200 L1440 320 Z"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        d="M0 320 L0 260 L200 190 L340 240 L520 160 L680 230 L840 180 L1000 250 L1180 170 L1330 230 L1440 210 L1440 320 Z"
        fill="currentColor"
      />
    </svg>
  )
}

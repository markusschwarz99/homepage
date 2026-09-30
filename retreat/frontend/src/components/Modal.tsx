import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Bottom-Sheet am Handy, zentrierter Dialog am Desktop. Escape/Hintergrund schließt. */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-xl md:max-w-lg md:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <button type="button" onClick={onClose} aria-label="Schließen" className="-m-1 p-1 text-grey">
        <X size={20} />
      </button>
    </div>
  )
}

export const INPUT = 'w-full rounded-lg border border-grey-50 bg-white px-3 py-2 text-base md:text-sm'
export const PRIMARY_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg bg-royal-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'

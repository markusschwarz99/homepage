import { useEffect, type ReactNode } from 'react'

/** iOS-Sheet: mobil von unten mit Griff, am Desktop zentriert. Escape/Hintergrund schließt. */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Hintergrund nicht mitscrollen
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
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
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[14px] bg-canvas shadow-2xl md:max-w-lg md:rounded-[14px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-grey-50 md:hidden" aria-hidden />
        {children}
      </div>
    </div>
  )
}

/** Navigationsleiste im Sheet: links Aktion, Mitte Titel, rechts Aktion. */
export function SheetHeader({ title, left, right }: { title: ReactNode; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-2 pb-2 md:pt-3">
      <div className="justify-self-start">{left}</div>
      <h2 className="max-w-[14rem] truncate text-[17px] font-semibold">{title}</h2>
      <div className="justify-self-end">{right}</div>
    </div>
  )
}

/** Scrollbarer Inhalt des Sheets. */
export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">{children}</div>
}

export const TEXT_BUTTON = 'text-[17px] text-royal-blue active:opacity-50 disabled:opacity-40'
export const TEXT_BUTTON_BOLD = `${TEXT_BUTTON} font-semibold`
/** iOS-Eingabefeld innerhalb einer Zeile: randlos. */
export const FIELD = 'w-full bg-transparent text-[16px] outline-none placeholder:text-grey-50'

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { shouldDismiss } from '../lib/gestures'

const CLOSE_MS = 250
const SPRING = '300ms cubic-bezier(0.32, 0.72, 0, 1)'
const isMobile = () => window.matchMedia('(width < 48rem)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * iOS-Sheet: mobil von unten mit Griff, am Desktop zentriert. Escape/Hintergrund
 * schließt, mobil auch nach unten wischen. `children` bekommt `close`, damit
 * auch Buttons im Sheet animiert schließen.
 */
export function Modal({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: (close: () => void) => ReactNode
}) {
  const sheet = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const closing = useRef(false)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  const close = useCallback(() => {
    const el = sheet.current
    const bg = backdrop.current
    if (closing.current) return
    closing.current = true
    if (!el || !bg || reducedMotion()) return onCloseRef.current()
    const ease = `${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`
    el.style.transition = `transform ${ease}, opacity ${ease}`
    bg.style.transition = `opacity ${ease}`
    if (isMobile()) {
      el.style.transform = 'translateY(100%)'
    } else {
      el.style.transform = 'scale(0.96)'
      el.style.opacity = '0'
    }
    bg.style.opacity = '0'
    window.setTimeout(() => onCloseRef.current(), CLOSE_MS)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    // Hintergrund nicht mitscrollen
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [close])

  // Nach unten wischen: Sheet folgt dem Finger, schließt bei genug Weg/Tempo.
  // Nur wenn der Inhalt ganz oben ist – sonst scrollt der Inhalt wie gewohnt.
  useEffect(() => {
    const el = sheet.current
    const bg = backdrop.current
    if (!el || !bg) return
    let state: 'off' | 'pending' | 'drag' = 'off'
    let startX = 0
    let startY = 0
    let lastY = 0
    let lastT = 0
    let velocity = 0

    const scrolled = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.scrollTop > 0) return true
      }
      return false
    }

    const onStart = (e: TouchEvent) => {
      state = e.touches.length === 1 && isMobile() && !closing.current && !scrolled(e.target) ? 'pending' : 'off'
      startX = e.touches[0].clientX
      startY = lastY = e.touches[0].clientY
      lastT = e.timeStamp
      velocity = 0
    }
    const onMove = (e: TouchEvent) => {
      if (state === 'off') return
      const { clientX, clientY } = e.touches[0]
      const dy = clientY - startY
      if (state === 'pending') {
        if (dy <= 0 || Math.abs(clientX - startX) > dy) {
          state = 'off'
          return
        }
        state = 'drag'
        el.style.transition = 'none'
        bg.style.transition = 'none'
      }
      if (e.cancelable) e.preventDefault()
      if (e.timeStamp > lastT) velocity = (clientY - lastY) / (e.timeStamp - lastT)
      lastY = clientY
      lastT = e.timeStamp
      const d = Math.max(0, dy)
      el.style.transform = `translateY(${d}px)`
      bg.style.opacity = String(1 - Math.min(d / el.offsetHeight, 1))
    }
    const onEnd = () => {
      if (state !== 'drag') return
      state = 'off'
      if (shouldDismiss(lastY - startY, velocity)) return close()
      el.style.transition = `transform ${SPRING}`
      bg.style.transition = `opacity ${SPRING}`
      el.style.transform = ''
      bg.style.opacity = ''
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [close])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div
        ref={backdrop}
        className="absolute inset-0 animate-fade-in bg-black/40 motion-reduce:animate-none"
        onClick={close}
        aria-hidden
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[92dvh] w-full animate-sheet-in flex-col overflow-hidden rounded-t-[14px] bg-canvas shadow-2xl motion-reduce:animate-none md:max-w-lg md:animate-pop-in md:rounded-[14px]"
      >
        <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-grey-50 md:hidden" aria-hidden />
        {children(close)}
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
  return (
    <div className="overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      {children}
    </div>
  )
}

export const TEXT_BUTTON = 'text-[17px] text-royal-blue active:opacity-50 disabled:opacity-40'
export const TEXT_BUTTON_BOLD = `${TEXT_BUTTON} font-semibold`
/** iOS-Eingabefeld innerhalb einer Zeile: randlos. */
export const FIELD = 'w-full bg-transparent text-[16px] outline-none placeholder:text-grey-50'

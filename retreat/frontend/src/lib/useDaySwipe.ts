import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { rubberBand, swipeStep } from './gestures'

const OUT_MS = 180
const IN_MS = 260
const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)'

/**
 * Mobil horizontal wischen = Tag wechseln (wie im iOS-Kalender): die Spalte folgt
 * dem Finger, fährt raus, der neue Tag fährt von der anderen Seite rein.
 * Vertikales Scrollen bleibt beim Browser (`touch-action: pan-y` am Element).
 */
export function useDaySwipe(ref: RefObject<HTMLElement | null>, canStep: (dir: -1 | 1) => boolean, onStep: (dir: -1 | 1) => void) {
  const latest = useRef({ canStep, onStep })
  useLayoutEffect(() => {
    latest.current = { canStep, onStep }
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let state: 'off' | 'pending' | 'drag' | 'animating' = 'off'
    let startX = 0
    let startY = 0
    let dx = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let swipedAt = -Infinity

    const move = (x: number, ms = 0) => {
      el.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none'
      el.style.transform = x ? `translateX(${x}px)` : ''
    }

    const onStart = (e: TouchEvent) => {
      if (state === 'animating') return
      state = e.touches.length === 1 && window.matchMedia('(width < 48rem)').matches ? 'pending' : 'off'
      startX = lastX = e.touches[0].clientX
      startY = e.touches[0].clientY
      lastT = e.timeStamp
      dx = velocity = 0
    }
    const onMove = (e: TouchEvent) => {
      if (state !== 'pending' && state !== 'drag') return
      const { clientX, clientY } = e.touches[0]
      dx = clientX - startX
      if (state === 'pending') {
        if (Math.abs(dx) < 8 && Math.abs(clientY - startY) < 8) return
        state = Math.abs(dx) > Math.abs(clientY - startY) ? 'drag' : 'off'
        if (state === 'off') return
      }
      if (e.timeStamp > lastT) velocity = (clientX - lastX) / (e.timeStamp - lastT)
      lastX = clientX
      lastT = e.timeStamp
      move(latest.current.canStep(dx < 0 ? 1 : -1) ? dx : rubberBand(dx))
    }
    const onEnd = () => {
      if (state !== 'drag') {
        if (state === 'pending') state = 'off'
        return
      }
      swipedAt = performance.now()
      const step = swipeStep(dx, velocity, el.offsetWidth)
      if (step === 0 || !latest.current.canStep(step)) {
        state = 'off'
        move(0, IN_MS)
        return
      }
      state = 'animating'
      const width = el.offsetWidth
      move(-step * width, OUT_MS)
      window.setTimeout(() => {
        latest.current.onStep(step)
        move(step * width)
        // zwei Frames warten, damit der Startpunkt gerendert ist, bevor es reinfährt
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            move(0, IN_MS)
            window.setTimeout(() => (state = 'off'), IN_MS)
          }),
        )
      }, OUT_MS)
    }
    // Nach einem Wisch keinen Klick auslösen (Termin öffnen / neuen Termin anlegen)
    const onClick = (e: MouseEvent) => {
      if (performance.now() - swipedAt > 400) return
      e.stopPropagation()
      e.preventDefault()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      el.removeEventListener('click', onClick, true)
    }
  }, [ref])
}

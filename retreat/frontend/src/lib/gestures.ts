// Entscheidungen für Wisch-Gesten (rein, testbar). Geschwindigkeit in px/ms.

/** Ab welcher Geste ein Sheet nach unten geschlossen wird: weit genug oder schnell genug. */
export function shouldDismiss(dy: number, velocity: number): boolean {
  return dy > 120 || (dy > 20 && velocity > 0.5)
}

/** Tageswechsel per Wischen: -1 = vorheriger, 1 = nächster Tag, 0 = zurückschnappen. */
export function swipeStep(dx: number, velocity: number, width: number): -1 | 0 | 1 {
  const far = Math.abs(dx) > width / 4
  const fast = Math.abs(dx) > 30 && Math.abs(velocity) > 0.4
  if (!far && !fast) return 0
  return dx < 0 ? 1 : -1
}

/** Gummiband am Rand: Bewegung wird gebremst, wenn es dort nicht weitergeht. */
export function rubberBand(d: number): number {
  return d / (1 + Math.abs(d) / 80)
}

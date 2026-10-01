import { describe, expect, it } from 'vitest'
import { rubberBand, shouldDismiss, swipeStep } from './gestures'

describe('shouldDismiss', () => {
  it('schließt bei weitem Zug', () => expect(shouldDismiss(150, 0.1)).toBe(true))
  it('schließt bei schnellem kurzen Wisch', () => expect(shouldDismiss(40, 0.8)).toBe(true))
  it('schnappt bei kleinem langsamen Zug zurück', () => expect(shouldDismiss(60, 0.2)).toBe(false))
  it('ignoriert Zug nach oben', () => expect(shouldDismiss(-200, -2)).toBe(false))
})

describe('swipeStep', () => {
  it('nach links = nächster Tag', () => expect(swipeStep(-120, 0.1, 300)).toBe(1))
  it('nach rechts = vorheriger Tag', () => expect(swipeStep(120, 0.1, 300)).toBe(-1))
  it('schneller kurzer Wisch reicht', () => expect(swipeStep(-40, -0.6, 300)).toBe(1))
  it('kleiner langsamer Zug schnappt zurück', () => expect(swipeStep(-50, -0.1, 300)).toBe(0))
})

describe('rubberBand', () => {
  it('bremst, behält aber die Richtung', () => {
    expect(rubberBand(80)).toBe(40)
    expect(rubberBand(-80)).toBe(-40)
    expect(rubberBand(0)).toBe(0)
  })
})

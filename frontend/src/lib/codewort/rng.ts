/**
 * Injizierbarer Zufall für das Codewort-Spiel (§13: Zufall muss seedbar sein,
 * sonst sind AC-2 und der E2E-Durchlauf nicht reproduzierbar).
 *
 * `Rng` ist eine Funktion, die eine Gleitkommazahl in [0, 1) liefert — genau
 * wie `Math.random`. Für Tests und den deterministischen E2E-Lauf liefert
 * `makeRng(seed)` einen reproduzierbaren Generator (mulberry32).
 */

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates-Shuffle einer Kopie von `items` mit dem gegebenen RNG. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

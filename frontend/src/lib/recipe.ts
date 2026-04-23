// Mengen schön formatieren (Brüche statt Dezimalzahlen wo sinnvoll)
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '';
  if (amount === 0) return '0';

  const whole = Math.floor(amount);
  const frac = amount - whole;

  // Gängige Brüche erkennen (Toleranz 0.02)
  const fractions: [number, string][] = [
    [1 / 4, '¼'],
    [1 / 3, '⅓'],
    [1 / 2, '½'],
    [2 / 3, '⅔'],
    [3 / 4, '¾'],
  ];
  for (const [val, sym] of fractions) {
    if (Math.abs(frac - val) < 0.02) {
      return whole > 0 ? `${whole} ${sym}` : sym;
    }
  }

  // Ganze Zahl
  if (Math.abs(frac) < 0.02) return String(whole);

  // Dezimal – max 2 Nachkommastellen, keine unnötigen Nullen
  return amount.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

// Skalieren von Zutaten-Menge mit sinnvoller Rundung
export function scaleAmount(amount: number | null, factor: number): number | null {
  if (amount == null) return null;
  const scaled = amount * factor;
  // Auf 2 Nachkommastellen runden – reicht für Küche
  return Math.round(scaled * 100) / 100;
}

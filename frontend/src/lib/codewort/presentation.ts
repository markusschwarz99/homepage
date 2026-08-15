/**
 * Darstellungs-Helfer: Rolle → Farbe UND Symbol/Label.
 *
 * Zugehörigkeit wird nie allein über Farbe kommuniziert (INV-16): jede
 * aufgedeckte Karte trägt zusätzlich ein formunterschiedliches Symbol, das
 * auch in Graustufen eindeutig bleibt (AC-17).
 */

import type { CardRole, TeamNames } from './types';

export interface RoleStyle {
  /** Anzeigename der Rolle (Teamname bzw. „Neutral"/„Attentäter"). */
  label: (names: TeamNames) => string;
  /** Formunterschiedliches Symbol — auch in Graustufen unterscheidbar. */
  symbol: string;
  /** Tailwind-Klassen für eine farbige Kartenfläche (aufgedeckt / Schlüssel). */
  swatch: string;
  /** Kleiner farbiger Punkt für Restzähler etc. */
  chip: string;
}

export const ROLE_STYLE: Record<CardRole, RoleStyle> = {
  teamA: {
    label: (n) => n.A,
    symbol: '●',
    swatch: 'bg-blue-600 text-white border-blue-800',
    chip: 'bg-blue-600',
  },
  teamB: {
    label: (n) => n.B,
    symbol: '◆',
    swatch: 'bg-amber-500 text-neutral-950 border-amber-700',
    chip: 'bg-amber-500',
  },
  neutral: {
    label: () => 'Neutral',
    symbol: '＝',
    swatch: 'bg-stone-300 text-stone-900 border-stone-500',
    chip: 'bg-stone-400',
  },
  assassin: {
    label: () => 'Attentäter',
    symbol: '☠',
    swatch: 'bg-neutral-900 text-white border-black',
    chip: 'bg-neutral-900',
  },
};

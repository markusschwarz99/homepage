import type { CardRole, TeamNames } from '../../lib/codewort/types';
import { ROLE_STYLE } from '../../lib/codewort/presentation';

interface Props {
  index: number;
  word: string;
  /**
   * Zugehörigkeit — oder `null`, wenn sie verborgen bleiben MUSS (unaufgedeckte
   * Karte in der Tisch-Sicht, INV-11). Bei `null` erscheint keinerlei
   * Rollen-Information im DOM: keine Farbe, kein Symbol, kein data-Attribut.
   */
  role: CardRole | null;
  revealed: boolean;
  /** Antippbar (Tisch-Sicht, unaufgedeckt, Rate-Phase). */
  interactive: boolean;
  selected: boolean;
  /** In der Chef-Sicht bereits aufgedeckte Karten werden abgesetzt. */
  dimmed?: boolean;
  onSelect?: (index: number) => void;
  teamNames: TeamNames;
}

const WORD_CLASS =
  'font-medium uppercase tracking-tight leading-tight break-words hyphens-auto ' +
  'text-[11px] sm:text-sm md:text-base';

export function CodewortCard({
  index,
  word,
  role,
  revealed,
  interactive,
  selected,
  dimmed = false,
  onSelect,
  teamNames,
}: Props) {
  // ----- Verborgene Zugehörigkeit (Tisch-Sicht, unaufgedeckt) -----
  // Bewusst KEINE rollenabhängige Klasse / kein data-role: INV-11.
  if (role === null) {
    return (
      <button
        type="button"
        onClick={interactive ? () => onSelect?.(index) : undefined}
        disabled={!interactive}
        aria-pressed={selected}
        aria-label={word}
        data-testid={`card-${index}`}
        data-revealed="false"
        className={[
          'aspect-[4/3] rounded-lg border flex items-center justify-center p-1 text-center',
          'transition-colors',
          selected
            ? 'border-accent ring-2 ring-accent bg-bg-secondary'
            : 'border-border bg-bg-primary',
          interactive ? 'cursor-pointer hover:bg-bg-secondary' : 'cursor-default',
        ].join(' ')}
      >
        <span className={WORD_CLASS}>{word}</span>
      </button>
    );
  }

  // ----- Sichtbare Zugehörigkeit (Chef-Schlüssel oder aufgedeckte Karte) -----
  const style = ROLE_STYLE[role];
  return (
    <div
      data-testid={`card-${index}`}
      data-revealed={revealed ? 'true' : 'false'}
      data-role={role}
      aria-label={`${word} – ${style.label(teamNames)}`}
      className={[
        'aspect-[4/3] rounded-lg border flex flex-col items-center justify-center p-1 text-center relative',
        style.swatch,
        dimmed && !revealed ? 'opacity-45' : '',
        revealed ? '' : 'ring-0',
      ].join(' ')}
    >
      <span aria-hidden="true" className="text-sm sm:text-base leading-none mb-0.5">
        {style.symbol}
      </span>
      <span className={WORD_CLASS}>{word}</span>
      {revealed && (
        <span className="absolute top-0.5 right-1 text-[9px] opacity-80" aria-hidden="true">
          ✓
        </span>
      )}
    </div>
  );
}

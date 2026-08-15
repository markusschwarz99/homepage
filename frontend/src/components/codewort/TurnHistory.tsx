import type { GameState, TurnEndReason } from '../../lib/codewort/types';
import { ROLE_STYLE } from '../../lib/codewort/presentation';

const END_REASON_TEXT: Record<TurnEndReason, string> = {
  wrong_card: 'falsche Karte',
  assassin: 'Attentäter',
  out_of_guesses: 'Versuche aufgebraucht',
  voluntary: 'Zug beendet',
  game_end: 'Spielende',
};

export function TurnHistory({ state }: { state: GameState }) {
  if (state.history.length === 0) {
    return <p className="text-sm text-text-muted">Noch keine Züge.</p>;
  }
  return (
    <ol className="space-y-2" data-testid="turn-history">
      {state.history.map((turn, i) => (
        <li key={i} className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium truncate">{state.teamNames[turn.team]}</span>
            <span className="text-text-muted whitespace-nowrap">
              {turn.clue.word.toUpperCase()} · {turn.clue.count}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {turn.reveals.map((r, j) => {
              const style = ROLE_STYLE[r.role];
              return (
                <span
                  key={j}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${style.swatch}`}
                >
                  <span aria-hidden="true">{style.symbol}</span>
                  {r.word}
                </span>
              );
            })}
            {turn.reveals.length === 0 && (
              <span className="text-text-muted text-xs">keine Aufdeckung</span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">Ende: {END_REASON_TEXT[turn.endReason]}</p>
        </li>
      ))}
    </ol>
  );
}

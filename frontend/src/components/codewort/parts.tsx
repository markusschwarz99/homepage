import type { Clue, GameState, Team, TeamNames } from '../../lib/codewort/types';
import { remainingAgents, guessesRemaining } from '../../lib/codewort/engine';
import { ROLE_STYLE } from '../../lib/codewort/presentation';

/** Restagenten beider Teams; das aktive Team ist hervorgehoben. */
export function ScoreBar({ state }: { state: GameState }) {
  return (
    <ScoreBarView
      remaining={remainingAgents(state)}
      activeTeam={state.phase !== 'ended' ? state.currentTeam : null}
      teamNames={state.teamNames}
    />
  );
}

/** Wie `ScoreBar`, aber aus fertigen Werten (Online-Modus: Zähler kommen vom Server). */
export function ScoreBarView({
  remaining,
  activeTeam,
  teamNames,
}: {
  remaining: Record<Team, number>;
  activeTeam: Team | null;
  teamNames: TeamNames;
}) {
  const teams: Team[] = ['A', 'B'];
  return (
    <div className="flex gap-2" data-testid="score-bar">
      {teams.map((t) => {
        const role = t === 'A' ? 'teamA' : 'teamB';
        const style = ROLE_STYLE[role];
        const active = activeTeam === t;
        return (
          <div
            key={t}
            data-testid={`score-${t}`}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 min-w-0',
              active ? 'border-accent bg-bg-secondary' : 'border-border bg-bg-primary',
            ].join(' ')}
          >
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white ${style.chip}`}
              aria-hidden="true"
            >
              {style.symbol}
            </span>
            <span className="text-sm truncate min-w-0 flex-1">{teamNames[t]}</span>
            <span className="text-lg font-semibold tabular-nums" data-testid={`remaining-${t}`}>
              {remaining[t]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Aktueller Hinweis + verbleibende Versuche (Tisch-Sicht). */
export function ClueBanner({ state }: { state: GameState }) {
  if (!state.clue) return null;
  return <ClueBannerView clue={state.clue} remaining={guessesRemaining(state)} />;
}

/** Wie `ClueBanner`, aber aus fertigen Werten. `remaining` Infinity = unbegrenzt. */
export function ClueBannerView({ clue, remaining }: { clue: Clue; remaining: number }) {
  return (
    <div
      className="rounded-lg border border-accent bg-bg-secondary px-4 py-3 text-center"
      data-testid="clue-banner"
    >
      <p className="text-2xl sm:text-3xl font-semibold tracking-wide break-words">
        <span data-testid="clue-word">{clue.word.toUpperCase()}</span>
        <span className="text-text-muted"> · </span>
        <span data-testid="clue-count">{clue.count}</span>
      </p>
      <p className="text-xs text-text-muted mt-1" data-testid="guesses-remaining">
        {remaining === Infinity
          ? 'Unbegrenzt viele Versuche'
          : `Noch ${remaining} ${remaining === 1 ? 'Versuch' : 'Versuche'}`}
      </p>
    </div>
  );
}

import type { GameState } from '../../lib/codewort/types';
import { Button } from '../Button';
import { CodewortCard } from './CodewortCard';
import { TurnHistory } from './TurnHistory';

interface Props {
  state: GameState;
  onRematch: () => void;
  onNewGame: () => void;
  rematchBusy?: boolean;
}

export function EndView({ state, onRematch, onNewGame, rematchBusy = false }: Props) {
  const winnerName = state.winner ? state.teamNames[state.winner] : '—';
  const reason =
    state.winReason === 'assassin'
      ? 'Das Gegenteam hat den Attentäter aufgedeckt.'
      : state.winReason === 'all_agents'
        ? 'Alle eigenen Agenten wurden gefunden.'
        : '';

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6">
        <p className="text-sm text-text-muted mb-1">Sieger</p>
        <h1 className="text-3xl sm:text-4xl font-semibold mb-2" data-testid="winner">
          {winnerName}
        </h1>
        <p className="text-sm text-text-muted" data-testid="win-reason">
          {reason}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-6" data-testid="end-grid">
        {state.cards.map((card, i) => (
          <CodewortCard
            key={i}
            index={i}
            word={card.word}
            role={card.role}
            revealed={card.revealed}
            dimmed
            interactive={false}
            selected={false}
            teamNames={state.teamNames}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <Button onClick={onRematch} disabled={rematchBusy} data-testid="rematch">
          {rematchBusy ? 'Neue Wörter …' : 'Revanche'}
        </Button>
        <Button variant="secondary" onClick={onNewGame} data-testid="new-game">
          Neue Partie
        </Button>
      </div>

      <h2 className="text-lg font-medium mb-3">Zugverlauf</h2>
      <TurnHistory state={state} />
    </div>
  );
}

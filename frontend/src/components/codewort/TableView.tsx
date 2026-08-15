import { useState } from 'react';
import type { GameState } from '../../lib/codewort/types';
import { canEndTurn, canUndo } from '../../lib/codewort/engine';
import { Button } from '../Button';
import { CodewortCard } from './CodewortCard';
import { ScoreBar, ClueBanner } from './parts';
import { TurnHistory } from './TurnHistory';

interface Props {
  state: GameState;
  onReveal: (index: number) => void;
  onEndTurn: () => void;
  onUndo: () => void;
}

/**
 * Tisch-Sicht / Ermitteln (§8.4). Zugehörigkeit unaufgedeckter Karten ist hier
 * nirgends erkennbar (INV-11). Aufdecken immer zweistufig: auswählen →
 * bestätigen (INV-15).
 */
export function TableView({ state, onReveal, onEndTurn, onUndo }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  function confirmReveal() {
    if (selected === null) return;
    const idx = selected;
    setSelected(null);
    onReveal(idx);
  }

  const selectedWord = selected !== null ? state.cards[selected].word : '';

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <div className="mb-3">
        <ClueBanner state={state} />
      </div>

      <div className="mb-3">
        <ScoreBar state={state} />
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4" data-testid="table-grid">
        {state.cards.map((card, i) => (
          <CodewortCard
            key={i}
            index={i}
            word={card.word}
            // Zugehörigkeit nur bei aufgedeckten Karten (INV-11).
            role={card.revealed ? card.role : null}
            revealed={card.revealed}
            interactive={!card.revealed}
            selected={selected === i}
            onSelect={setSelected}
            teamNames={state.teamNames}
          />
        ))}
      </div>

      {/* Zweistufige Bestätigung (INV-15) */}
      {selected !== null && (
        <div
          className="rounded-xl border border-accent bg-bg-secondary p-3 mb-4 flex flex-wrap items-center gap-3"
          data-testid="confirm-bar"
        >
          <span className="text-sm flex-1 min-w-0">
            „<span className="font-medium">{selectedWord}</span>" aufdecken?
          </span>
          <Button variant="secondary" onClick={() => setSelected(null)} data-testid="cancel-reveal">
            Abbrechen
          </Button>
          <Button onClick={confirmReveal} data-testid="confirm-reveal">
            Aufdecken
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={onEndTurn}
          disabled={!canEndTurn(state)}
          data-testid="end-turn"
        >
          Zug beenden
        </Button>
        {canUndo(state) && (
          <Button variant="secondary" onClick={onUndo} data-testid="undo">
            Letzten Tipp zurücknehmen
          </Button>
        )}
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="ml-auto text-sm text-text-muted hover:text-text-primary underline"
          data-testid="toggle-history"
        >
          {showHistory ? 'Verlauf ausblenden' : 'Verlauf'}
        </button>
      </div>

      {showHistory && (
        <div className="mt-4">
          <TurnHistory state={state} />
        </div>
      )}
    </div>
  );
}

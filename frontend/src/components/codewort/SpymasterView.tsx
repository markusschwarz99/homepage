import { useState } from 'react';
import type { Clue, GameState } from '../../lib/codewort/types';
import { Button } from '../Button';
import { CodewortCard } from './CodewortCard';
import { ScoreBar } from './parts';

interface Props {
  state: GameState;
  onGiveClue: (clue: Clue) => void;
}

/**
 * Chef-Sicht (§8.3): alle 25 Wörter mit Zugehörigkeit (Schlüssel), Restzähler,
 * Hinweiseingabe. Karten sind hier NICHT antippbar — der Chef deckt nichts auf.
 * Die Hinweisabgabe ist der einzige Ausgang.
 */
export function SpymasterView({ state, onGiveClue }: Props) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');

  function submit() {
    const w = word.trim();
    if (!w) {
      setError('Bitte ein Hinweiswort eingeben.');
      return;
    }
    if (/\s/.test(w)) {
      setError('Ein Hinweis besteht aus genau einem Wort.');
      return;
    }
    if (!Number.isInteger(count) || count < 0) {
      setError('Die Hinweiszahl muss 0 oder größer sein.');
      return;
    }
    setError('');
    onGiveClue({ word: w, count });
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h1
          className="text-lg sm:text-xl font-medium"
          data-testid="spymaster-title"
          data-team={state.currentTeam}
        >
          Chef-Sicht · {state.teamNames[state.currentTeam]}
        </h1>
      </div>

      <div className="mb-3">
        <ScoreBar state={state} />
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-5" data-testid="spymaster-grid">
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

      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <h2 className="text-sm font-medium mb-3">Hinweis abgeben</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1">
            <span className="block text-xs text-text-muted mb-1">Hinweiswort (ein Wort)</span>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              maxLength={40}
              autoFocus
              data-testid="clue-word-input"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
            />
          </label>
          <label className="w-full sm:w-28">
            <span className="block text-xs text-text-muted mb-1">Zahl (0 = unbegr.)</span>
            <input
              type="number"
              min={0}
              max={9}
              value={count}
              onChange={(e) => setCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              data-testid="clue-count-input"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
            />
          </label>
          <Button onClick={submit} data-testid="give-clue">
            Hinweis geben
          </Button>
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2" data-testid="clue-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

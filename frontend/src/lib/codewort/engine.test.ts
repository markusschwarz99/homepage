import { describe, it, expect } from 'vitest';
import {
  createGame,
  confirmHandoff,
  giveClue,
  revealCard,
  endTurnVoluntary,
  undo,
  canEndTurn,
  canUndo,
  guessesRemaining,
  remainingAgents,
  makeRng,
  BOARD_SIZE,
} from './engine';
import type { CardRole, Clue, GameState } from './types';

const WORDS = Array.from({ length: BOARD_SIZE }, (_, i) => `Wort${i}`);

function indicesByRole(state: GameState, role: CardRole): number[] {
  return state.cards.flatMap((c, i) => (c.role === role ? [i] : []));
}

/** createGame → bis in die Rate-Phase mit gegebenem Hinweis. */
function toGuessing(state: GameState, clue: Clue): GameState {
  return confirmHandoff(giveClue(confirmHandoff(state), clue));
}

function newGame(startTeam?: 'A' | 'B', seed = 42): GameState {
  return createGame({ words: WORDS, startTeam }, makeRng(seed));
}

describe('Aufbau (AC-1, AC-2)', () => {
  it('AC-1: 25 verschiedene Wörter mit Verteilung 9/8/7/1', () => {
    const g = newGame('A');
    expect(g.cards).toHaveLength(25);
    expect(new Set(g.cards.map((c) => c.word)).size).toBe(25);
    const counts: Record<CardRole, number> = { teamA: 0, teamB: 0, neutral: 0, assassin: 0 };
    for (const c of g.cards) counts[c.role]++;
    expect(counts).toEqual({ teamA: 9, teamB: 8, neutral: 7, assassin: 1 });
  });

  it('AC-1: Startteam hat die 9 (INV-2)', () => {
    expect(indicesByRole(newGame('A'), 'teamA')).toHaveLength(9);
    expect(indicesByRole(newGame('B'), 'teamB')).toHaveLength(9);
  });

  it('AC-1: wirft bei falscher Wortanzahl oder Duplikaten (INV-1)', () => {
    expect(() => createGame({ words: WORDS.slice(0, 24) })).toThrow();
    const dup = [...WORDS.slice(0, 24), 'Wort0'];
    expect(() => createGame({ words: dup })).toThrow();
  });

  it('AC-2: Attentäter-Position und Startteam sind über 2000 Partien gleichverteilt', () => {
    const rng = makeRng(12345);
    const assassinPos = new Array(BOARD_SIZE).fill(0);
    let startA = 0;
    const N = 2000;
    for (let n = 0; n < N; n++) {
      const g = createGame({ words: WORDS }, rng); // Startteam zufällig
      assassinPos[indicesByRole(g, 'assassin')[0]]++;
      if (g.startTeam === 'A') startA++;
    }
    // Erwartung pro Position: 80. Kein systematisches Muster → jede Position gut belegt.
    const min = Math.min(...assassinPos);
    const max = Math.max(...assassinPos);
    expect(min).toBeGreaterThan(40);
    expect(max).toBeLessThan(130);
    // Startteam ~50/50.
    expect(startA).toBeGreaterThan(N * 0.4);
    expect(startA).toBeLessThan(N * 0.6);
  });
});

describe('Zugverlauf (AC-3 bis AC-10)', () => {
  it('AC-3: Hinweis „X · 2" erlaubt höchstens 3 Aufdeckungen', () => {
    let g = toGuessing(newGame('A'), { word: 'Brücke', count: 2 });
    const own = indicesByRole(g, 'teamA');
    expect(guessesRemaining(g)).toBe(3);
    g = revealCard(g, own[0]);
    g = revealCard(g, own[1]);
    expect(g.phase).toBe('guessing');
    expect(guessesRemaining(g)).toBe(1);
    g = revealCard(g, own[2]); // dritter Tipp → Versuche aufgebraucht
    expect(g.phase).toBe('handoffToSpymaster');
    expect(g.currentTeam).toBe('B');
  });

  it('AC-4: Hinweis „X · 0" erlaubt beliebig viele Aufdeckungen', () => {
    let g = toGuessing(newGame('A'), { word: 'Alles', count: 0 });
    expect(guessesRemaining(g)).toBe(Infinity);
    const own = indicesByRole(g, 'teamA');
    for (let i = 0; i < 5; i++) {
      g = revealCard(g, own[i]);
      expect(g.phase).toBe('guessing');
    }
    expect(guessesRemaining(g)).toBe(Infinity);
  });

  it('AC-5: eigener Agent → Zug bleibt beim Team, Restzähler -1', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    const before = remainingAgents(g).A;
    g = revealCard(g, indicesByRole(g, 'teamA')[0]);
    expect(g.currentTeam).toBe('A');
    expect(g.phase).toBe('guessing');
    expect(remainingAgents(g).A).toBe(before - 1);
  });

  it('AC-6: neutrale Karte beendet den Zug sofort', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    g = revealCard(g, indicesByRole(g, 'neutral')[0]);
    expect(g.phase).toBe('handoffToSpymaster');
    expect(g.currentTeam).toBe('B');
  });

  it('AC-7: gegnerische Karte beendet den Zug und senkt Gegnerzähler', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    const beforeB = remainingAgents(g).B;
    g = revealCard(g, indicesByRole(g, 'teamB')[0]);
    expect(g.phase).toBe('handoffToSpymaster');
    expect(g.currentTeam).toBe('B');
    expect(remainingAgents(g).B).toBe(beforeB - 1);
  });

  it('AC-8: Attentäter beendet die Partie mit Sieg des Gegners (INV-8)', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    g = revealCard(g, indicesByRole(g, 'assassin')[0]);
    expect(g.phase).toBe('ended');
    expect(g.winner).toBe('B');
    expect(g.winReason).toBe('assassin');
  });

  it('AC-9: „Zug beenden" erst nach dem ersten Tipp', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    expect(canEndTurn(g)).toBe(false);
    expect(() => endTurnVoluntary(g)).toThrow();
    g = revealCard(g, indicesByRole(g, 'teamA')[0]);
    expect(canEndTurn(g)).toBe(true);
    g = endTurnVoluntary(g);
    expect(g.currentTeam).toBe('B');
    expect(g.phase).toBe('handoffToSpymaster');
  });

  it('AC-10: letzter Agent eines Teams – auch vom Gegner aufgedeckt – beendet die Partie', () => {
    // B (zweites Team, 8 Agenten) deckt in einem Zug 7 eigene auf, lässt 1 übrig,
    // beendet freiwillig. Danach deckt A den letzten B-Agenten auf → B gewinnt.
    let g = newGame('A');
    const teamB = indicesByRole(g, 'teamB');
    // A macht einen Minimalzug, um an B zu übergeben.
    g = toGuessing(g, { word: 'A-Hinweis', count: 1 });
    g = revealCard(g, indicesByRole(g, 'teamA')[0]);
    g = endTurnVoluntary(g); // → B
    // B deckt 7 der 8 eigenen Agenten auf.
    g = toGuessing(g, { word: 'B-Hinweis', count: 7 });
    for (let i = 0; i < 7; i++) g = revealCard(g, teamB[i]);
    expect(remainingAgents(g).B).toBe(1);
    g = endTurnVoluntary(g); // → A
    // A gibt einen Hinweis und deckt versehentlich B's letzten Agenten auf.
    g = toGuessing(g, { word: 'A-Hinweis2', count: 1 });
    g = revealCard(g, teamB[7]);
    expect(g.phase).toBe('ended');
    expect(g.winner).toBe('B');
    expect(g.winReason).toBe('all_agents');
  });
});

describe('Undo (§15.1)', () => {
  it('nimmt die letzte Aufdeckung zurück und stellt Zähler + Phase wieder her', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    const beforeA = remainingAgents(g).A;
    const idx = indicesByRole(g, 'teamA')[0];
    g = revealCard(g, idx);
    expect(g.cards[idx].revealed).toBe(true);
    expect(canUndo(g)).toBe(true);
    g = undo(g);
    expect(g.cards[idx].revealed).toBe(false);
    expect(remainingAgents(g).A).toBe(beforeA);
    expect(g.phase).toBe('guessing');
    expect(canUndo(g)).toBe(false);
  });

  it('macht auch einen zugbeendenden Fehltipp rückgängig', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    g = revealCard(g, indicesByRole(g, 'neutral')[0]);
    expect(g.phase).toBe('handoffToSpymaster');
    g = undo(g);
    expect(g.phase).toBe('guessing');
    expect(g.currentTeam).toBe('A');
  });

  it('macht auch den Attentäter rückgängig (Partieende zurücknehmbar)', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    g = revealCard(g, indicesByRole(g, 'assassin')[0]);
    expect(g.phase).toBe('ended');
    g = undo(g);
    expect(g.phase).toBe('guessing');
    expect(g.winner).toBeNull();
  });

  it('nur ein Schritt: nach zwei Aufdeckungen ist nur die letzte rücknehmbar', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    const own = indicesByRole(g, 'teamA');
    g = revealCard(g, own[0]);
    g = revealCard(g, own[1]);
    g = undo(g);
    expect(g.cards[own[1]].revealed).toBe(false);
    expect(g.cards[own[0]].revealed).toBe(true); // erste bleibt aufgedeckt
    expect(canUndo(g)).toBe(false);
  });

  it('kein Undo über einen Übergabe-Screen hinweg', () => {
    let g = toGuessing(newGame('A'), { word: 'X', count: 3 });
    g = revealCard(g, indicesByRole(g, 'neutral')[0]); // Zug endet, Undo verfügbar
    g = confirmHandoff(g); // Gerät übergeben → Undo weg
    expect(canUndo(g)).toBe(false);
    expect(() => undo(g)).toThrow();
  });
});

describe('Hinweis-Validierung (INV-4)', () => {
  it('lehnt leeres oder mehrteiliges Hinweiswort und negative Zahl ab', () => {
    const spy = confirmHandoff(newGame('A'));
    expect(() => giveClue(spy, { word: '', count: 1 })).toThrow();
    expect(() => giveClue(spy, { word: 'zwei wörter', count: 1 })).toThrow();
    expect(() => giveClue(spy, { word: 'ok', count: -1 })).toThrow();
  });
});

/**
 * Reine Spiellogik für Codewort — ohne UI-Abhängigkeit (§13).
 *
 * Alle Funktionen sind seiteneffektfrei: sie nehmen einen `GameState` und
 * liefern einen neuen. Ungültige Übergänge werfen einen Fehler; die UI schützt
 * sich vorher über die `can*`-Helfer.
 *
 * Die Invarianten INV-1..INV-10 aus der Spezifikation sind hier verankert.
 */

import type { Rng } from './rng';
import { makeRng, shuffle } from './rng';
import type {
  Card,
  Clue,
  GameConfig,
  GameState,
  RevealEntry,
  Team,
  TeamNames,
  TurnEndReason,
} from './types';

/** Eine Auslage besteht aus genau 25 Karten (5×5). */
export const BOARD_SIZE = 25;
/** Kartenverteilung 9 / 8 / 7 / 1 (INV-2). Das Startteam hat die 9. */
export const START_TEAM_AGENTS = 9;
export const SECOND_TEAM_AGENTS = 8;
export const NEUTRAL_CARDS = 7;
export const ASSASSIN_CARDS = 1;

const DEFAULT_TEAM_NAMES: TeamNames = { A: 'Team A', B: 'Team B' };

function other(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

/** Kartenrolle (Farbslot) eines Teams — fix, unabhängig davon wer startet. */
function roleOf(team: Team): 'teamA' | 'teamB' {
  return team === 'A' ? 'teamA' : 'teamB';
}

/** Noch nicht aufgedeckte Agenten je Team. */
export function remainingAgents(state: GameState): { A: number; B: number } {
  let a = 0;
  let b = 0;
  for (const c of state.cards) {
    if (c.revealed) continue;
    if (c.role === 'teamA') a++;
    else if (c.role === 'teamB') b++;
  }
  return { A: a, B: b };
}

/** Erlaubte Tipps pro Zug: Hinweiszahl + 1, bei 0 unbegrenzt (INV-5). */
function guessLimit(clue: Clue): number | null {
  return clue.count === 0 ? null : clue.count + 1;
}

/** Verbleibende Tipps im laufenden Zug (Infinity bei Hinweiszahl 0). */
export function guessesRemaining(state: GameState): number {
  if (!state.clue || state.phase !== 'guessing') return 0;
  const limit = guessLimit(state.clue);
  return limit === null ? Infinity : limit - state.guessesMade;
}

/** „Zug beenden" ist erst ab dem ersten Tipp verfügbar (INV-10 / AC-9). */
export function canEndTurn(state: GameState): boolean {
  return state.phase === 'guessing' && state.guessesMade >= 1;
}

/** Genau eine (die letzte) Aufdeckung lässt sich zurücknehmen (§15.1). */
export function canUndo(state: GameState): boolean {
  return state.previousState !== null;
}

/** Schnappschuss ohne verschachtelte Undo-Historie (nur ein Schritt). */
function snapshot(state: GameState): GameState {
  return { ...state, previousState: null };
}

/**
 * Neue Partie aufbauen. Wirft, wenn nicht exakt 25 paarweise verschiedene
 * Wörter geliefert werden (INV-1). Rollen werden 9/8/7/1 verteilt (INV-2) und
 * über alle Positionen gemischt; das Startteam ergibt sich zufällig aus dem
 * RNG, sofern nicht vorgegeben (INV-3).
 */
export function createGame(config: GameConfig, rng: Rng = Math.random): GameState {
  const words = config.words;
  if (words.length !== BOARD_SIZE) {
    throw new Error(`Eine Auslage braucht genau ${BOARD_SIZE} Wörter, erhalten: ${words.length}`);
  }
  if (new Set(words.map((w) => w.trim().toLowerCase())).size !== BOARD_SIZE) {
    throw new Error('Die 25 Wörter müssen paarweise verschieden sein (INV-1)');
  }

  const startTeam: Team = config.startTeam ?? (rng() < 0.5 ? 'A' : 'B');
  const roleStart = roleOf(startTeam);
  const roleOther = roleOf(other(startTeam));

  const roles: Card['role'][] = [
    ...Array<Card['role']>(START_TEAM_AGENTS).fill(roleStart),
    ...Array<Card['role']>(SECOND_TEAM_AGENTS).fill(roleOther),
    ...Array<Card['role']>(NEUTRAL_CARDS).fill('neutral'),
    ...Array<Card['role']>(ASSASSIN_CARDS).fill('assassin'),
  ];
  const shuffledRoles = shuffle(roles, rng);

  const cards: Card[] = words.map((word, i) => ({
    word,
    role: shuffledRoles[i],
    revealed: false,
  }));

  return {
    cards,
    startTeam,
    currentTeam: startTeam,
    phase: 'handoffToSpymaster',
    clue: null,
    guessesMade: 0,
    teamNames: config.teamNames ?? DEFAULT_TEAM_NAMES,
    history: [],
    currentReveals: [],
    winner: null,
    winReason: null,
    packId: config.packId ?? null,
    packName: config.packName ?? null,
    previousState: null,
  };
}

/** Übergabe-Screen bestätigen: → Chef-Sicht bzw. → Tisch-Sicht (§6). */
export function confirmHandoff(state: GameState): GameState {
  if (state.phase === 'handoffToSpymaster') {
    return { ...state, phase: 'spymaster', previousState: null };
  }
  if (state.phase === 'handoffToTable') {
    return { ...state, phase: 'guessing', previousState: null };
  }
  throw new Error(`confirmHandoff in Phase "${state.phase}" nicht erlaubt`);
}

/** Hinweis abgeben (INV-4): ein Wort + Zahl >= 0. Danach Übergabe an den Tisch. */
export function giveClue(state: GameState, clue: Clue): GameState {
  if (state.phase !== 'spymaster') {
    throw new Error(`giveClue in Phase "${state.phase}" nicht erlaubt`);
  }
  const word = clue.word.trim();
  if (!word) throw new Error('Hinweiswort darf nicht leer sein');
  if (/\s/.test(word)) throw new Error('Ein Hinweis besteht aus genau einem Wort (INV-4)');
  if (!Number.isInteger(clue.count) || clue.count < 0) {
    throw new Error('Hinweiszahl muss eine ganze Zahl >= 0 sein (INV-4)');
  }
  return {
    ...state,
    clue: { word, count: clue.count },
    guessesMade: 0,
    currentReveals: [],
    phase: 'handoffToTable',
    previousState: null,
  };
}

/** Zug beenden und an das andere Team übergeben. */
function endTurn(state: GameState, endReason: TurnEndReason, keepUndo: GameState | null): GameState {
  const history = state.clue
    ? [
        ...state.history,
        {
          team: state.currentTeam,
          clue: state.clue,
          reveals: state.currentReveals,
          endReason,
        },
      ]
    : state.history;
  return {
    ...state,
    history,
    currentTeam: other(state.currentTeam),
    clue: null,
    guessesMade: 0,
    currentReveals: [],
    phase: 'handoffToSpymaster',
    previousState: keepUndo,
  };
}

/** Partie beenden. */
function endGame(
  state: GameState,
  winner: Team,
  winReason: GameState['winReason'],
  endReason: TurnEndReason,
  keepUndo: GameState | null,
): GameState {
  const history = state.clue
    ? [
        ...state.history,
        {
          team: state.currentTeam,
          clue: state.clue,
          reveals: state.currentReveals,
          endReason,
        },
      ]
    : state.history;
  return {
    ...state,
    history,
    phase: 'ended',
    winner,
    winReason,
    previousState: keepUndo,
  };
}

/**
 * Eine Karte aufdecken (in der Tisch-Sicht). Wertet die Konsequenz aus:
 * eigener Agent (weiter raten / Versuche aufgebraucht), neutrale/gegnerische
 * Karte (Zug endet), Attentäter (Partie verloren) oder letzter Agent eines
 * Teams (Partie gewonnen). INV-6, INV-8, INV-9.
 */
export function revealCard(state: GameState, index: number): GameState {
  if (state.phase !== 'guessing' || !state.clue) {
    throw new Error(`revealCard in Phase "${state.phase}" nicht erlaubt`);
  }
  const card = state.cards[index];
  if (!card) throw new Error(`Karte ${index} existiert nicht`);
  if (card.revealed) throw new Error(`Karte ${index} ist bereits aufgedeckt`);

  const undo = snapshot(state);
  const cards = state.cards.map((c, i) => (i === index ? { ...c, revealed: true } : c));
  const entry: RevealEntry = { index, word: card.word, role: card.role };
  const base: GameState = {
    ...state,
    cards,
    currentReveals: [...state.currentReveals, entry],
    previousState: undo,
  };

  // Attentäter: aktives Team verliert sofort (INV-8).
  if (card.role === 'assassin') {
    return endGame(base, other(state.currentTeam), 'assassin', 'assassin', undo);
  }

  // Neutrale Karte: Zug endet sofort (INV-6).
  if (card.role === 'neutral') {
    return endTurn(base, 'wrong_card', undo);
  }

  // Agentenkarte: Zähler des zugehörigen Teams sinkt (implizit über `revealed`).
  const revealedTeam: Team = card.role === 'teamA' ? 'A' : 'B';
  const rem = remainingAgents(base);

  // Letzter Agent eines Teams aufgedeckt — dieses Team gewinnt (INV-9 / AC-10),
  // unabhängig davon, wer die Karte aufgedeckt hat.
  if (rem[revealedTeam] === 0) {
    return endGame(base, revealedTeam, 'all_agents', 'game_end', undo);
  }

  if (revealedTeam === state.currentTeam) {
    // Eigener Agent: weiter raten, sofern noch Versuche übrig sind (INV-5).
    const guessesMade = state.guessesMade + 1;
    const limit = guessLimit(state.clue);
    const withGuess: GameState = { ...base, guessesMade };
    if (limit !== null && guessesMade >= limit) {
      return endTurn(withGuess, 'out_of_guesses', undo);
    }
    return withGuess;
  }

  // Gegnerische Karte: Zug endet sofort, Gegnerzähler ist bereits gesunken (INV-6).
  return endTurn(base, 'wrong_card', undo);
}

/** Zug freiwillig beenden (nur ab dem ersten Tipp, INV-10). */
export function endTurnVoluntary(state: GameState): GameState {
  if (!canEndTurn(state)) {
    throw new Error('„Zug beenden" ist erst nach dem ersten Tipp verfügbar (INV-10)');
  }
  // Freiwilliges Beenden ist bewusst — kein Undo darüber hinweg.
  return endTurn(state, 'voluntary', null);
}

/** Die letzte Aufdeckung zurücknehmen (§15.1). Wirft, wenn nichts vorliegt. */
export function undo(state: GameState): GameState {
  if (!state.previousState) {
    throw new Error('Keine Aufdeckung zum Zurücknehmen vorhanden');
  }
  return { ...state.previousState, previousState: null };
}

/** Neue Partie mit denselben Teams, neuen Wörtern (Revanche). */
export function rematch(state: GameState, words: string[], rng: Rng = Math.random): GameState {
  return createGame(
    {
      words,
      teamNames: state.teamNames,
      packId: state.packId,
      packName: state.packName,
    },
    rng,
  );
}

/** Bequemer Testhelfer: erzeugt eine seedbare RNG (re-export). */
export { makeRng };

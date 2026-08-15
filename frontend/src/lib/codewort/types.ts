/** Domänentypen für das Codewort-Spiel. Reine Daten, keine UI. */

export type Team = 'A' | 'B';

/** Zugehörigkeit einer Karte. `teamA`/`teamB` sind feste Farbslots der Teams. */
export type CardRole = 'teamA' | 'teamB' | 'neutral' | 'assassin';

/**
 * Spielphasen (§6). „setup" ist bewusst nicht enthalten — solange keine Partie
 * läuft, ist der Spielzustand schlicht `null`; das Setup lebt in der UI.
 */
export type Phase =
  | 'handoffToSpymaster'
  | 'spymaster'
  | 'handoffToTable'
  | 'guessing'
  | 'ended';

export type WinReason = 'all_agents' | 'assassin';

export type TurnEndReason =
  | 'wrong_card' // neutrale oder gegnerische Karte aufgedeckt
  | 'assassin'
  | 'out_of_guesses'
  | 'voluntary'
  | 'game_end';

export interface Card {
  word: string;
  role: CardRole;
  revealed: boolean;
}

/** Ein Hinweis: genau ein Wort + eine Zahl >= 0 (INV-4). 0 = unbegrenzt (INV-5). */
export interface Clue {
  word: string;
  count: number;
}

export interface RevealEntry {
  index: number;
  word: string;
  role: CardRole;
}

export interface TurnEntry {
  team: Team;
  clue: Clue;
  reveals: RevealEntry[];
  endReason: TurnEndReason;
}

export interface TeamNames {
  A: string;
  B: string;
}

export interface GameConfig {
  /** Genau 25 paarweise verschiedene Wörter (INV-1). */
  words: string[];
  /** Startteam (hat die 9). Ohne Angabe zufällig via RNG (INV-3). */
  startTeam?: Team;
  teamNames?: TeamNames;
  packId?: number | null;
  packName?: string | null;
}

export interface GameState {
  cards: Card[];
  startTeam: Team;
  currentTeam: Team;
  phase: Phase;
  clue: Clue | null;
  /** Bereits abgegebene Tipps im laufenden Zug. */
  guessesMade: number;
  teamNames: TeamNames;
  history: TurnEntry[];
  /** Aufdeckungen des laufenden Zugs (fließen bei Zugende in die History). */
  currentReveals: RevealEntry[];
  winner: Team | null;
  winReason: WinReason | null;
  packId: number | null;
  packName: string | null;
  /**
   * Schnappschuss vor der letzten Aufdeckung — Basis für das Ein-Schritt-Undo
   * (§15.1). `null`, sobald kein Zurücknehmen (mehr) möglich ist.
   */
  previousState: GameState | null;
}

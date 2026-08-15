import type { CardRole, Team, TeamNames } from '../../lib/codewort/types';
import { ROLE_STYLE } from '../../lib/codewort/presentation';
import { Button } from '../Button';

export interface Outcome {
  word: string;
  role: CardRole;
  /** Team, das die Karte aufgedeckt hat. */
  revealerTeam: Team;
  endedGame: boolean;
  winner: Team | null;
}

interface Props {
  outcome: Outcome;
  teamNames: TeamNames;
  canUndo: boolean;
  onUndo: () => void;
  onContinue: () => void;
}

function message(outcome: Outcome, names: TeamNames): { title: string; text: string } {
  const { role, revealerTeam, endedGame, winner } = outcome;
  if (role === 'assassin') {
    return {
      title: 'Attentäter!',
      text: `${names[revealerTeam]} hat den Attentäter aufgedeckt und verliert die Partie.`,
    };
  }
  if (endedGame && winner) {
    return { title: 'Partie entschieden', text: `${names[winner]} hat alle Agenten gefunden!` };
  }
  if (role === 'neutral') {
    return { title: 'Neutrale Karte', text: 'Kein Treffer — der Zug ist beendet.' };
  }
  const roleTeam: Team = role === 'teamA' ? 'A' : 'B';
  if (roleTeam === revealerTeam) {
    return { title: 'Versuche aufgebraucht', text: 'Der Zug ist beendet.' };
  }
  return { title: `Karte von ${names[roleTeam]}`, text: 'Falsches Team — der Zug ist beendet.' };
}

/** Konsequenz einer Aufdeckung ansagen (§8.4) und ein letztes Undo anbieten (§15.1). */
export function TurnResult({ outcome, teamNames, canUndo, onUndo, onContinue }: Props) {
  const { title, text } = message(outcome, teamNames);
  const style = ROLE_STYLE[outcome.role];
  return (
    <section
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-6 text-center bg-bg-primary"
      data-testid="turn-result"
      data-ended={outcome.endedGame ? 'true' : 'false'}
    >
      <div
        className={`inline-flex flex-col items-center gap-1 rounded-xl border px-6 py-4 mb-6 ${style.swatch}`}
      >
        <span className="text-2xl" aria-hidden="true">
          {style.symbol}
        </span>
        <span className="text-lg font-semibold uppercase tracking-tight">{outcome.word}</span>
        <span className="text-xs opacity-90">{style.label(teamNames)}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-text-muted max-w-md mb-8">{text}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {canUndo && (
          <Button variant="secondary" onClick={onUndo} data-testid="turn-result-undo">
            Fehltipp zurücknehmen
          </Button>
        )}
        <Button onClick={onContinue} data-testid="turn-result-continue">
          {outcome.endedGame ? 'Ergebnis ansehen' : 'Weiter zur Übergabe'}
        </Button>
      </div>
    </section>
  );
}

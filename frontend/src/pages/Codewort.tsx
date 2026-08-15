import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { SetupView } from '../components/codewort/SetupView';
import type { StartParams } from '../components/codewort/SetupView';
import { HandoffScreen } from '../components/codewort/HandoffScreen';
import { SpymasterView } from '../components/codewort/SpymasterView';
import { TableView } from '../components/codewort/TableView';
import { EndView } from '../components/codewort/EndView';
import { TurnResult } from '../components/codewort/TurnResult';
import type { Outcome } from '../components/codewort/TurnResult';
import { drawCodewortWords } from '../api/codewort';
import {
  createGame,
  confirmHandoff,
  giveClue,
  revealCard,
  endTurnVoluntary,
  undo,
  canUndo,
} from '../lib/codewort/engine';
import type { Clue, GameState } from '../lib/codewort/types';

const STORAGE_KEY = 'codewort:game:v1';
const RECENT_KEY = 'codewort:recent:v1';
const RECENT_CAP = 75;

// --- Wake Lock (typarm, da Browser-Unterstützung optional ist, §15.6) ---
interface WakeLockish {
  release: () => Promise<void>;
}
interface NavigatorWithWakeLock {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockish> };
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(words: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(words.slice(0, RECENT_CAP)));
  } catch {
    // localStorage nicht verfügbar → egal, „meiden" ist nur wünschenswert.
  }
}

/**
 * Persistierten Spielstand laden und für INV-13 absichern: nach einem Reload
 * niemals direkt in die Chef-Sicht — die Chef-Sicht wird auf ihren
 * Übergabe-Screen zurückgesetzt. Undo überlebt einen Reload nicht.
 */
function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (!g || !Array.isArray(g.cards) || g.cards.length !== 25) return null;
    const phase = g.phase === 'spymaster' ? 'handoffToSpymaster' : g.phase;
    return { ...g, phase, previousState: null };
  } catch {
    return null;
  }
}

export function Codewort() {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [reviewing, setReviewing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rematchBusy, setRematchBusy] = useState(false);
  const initialLoad = useRef(true);

  // ---------- Persistenz ----------
  useEffect(() => {
    // Den beim Mount geladenen Zustand nicht sofort zurückschreiben.
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    try {
      if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, previousState: null }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [game]);

  // ---------- Wake Lock: Bildschirm während der Partie wachhalten (§15.6) ----------
  const active = !!game && game.phase !== 'ended';
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    let sentinel: WakeLockish | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request('screen');
        if (cancelled) s.release().catch(() => {});
        else sentinel = s;
      } catch {
        // z.B. nicht sichtbar oder nicht erlaubt → ignorieren
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [active]);

  // ---------- Fokus-Guard: Chef-Sicht bei Sichtverlust sofort verlassen (INV-14) ----------
  const inSpymaster = game?.phase === 'spymaster';
  useEffect(() => {
    if (!inSpymaster) return;
    const leave = () =>
      setGame((g) =>
        g && g.phase === 'spymaster'
          ? { ...g, phase: 'handoffToSpymaster', previousState: null }
          : g,
      );
    const onVis = () => {
      if (document.visibilityState === 'hidden') leave();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', leave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', leave);
    };
  }, [inSpymaster]);

  // ---------- Aktionen ----------
  const handleStart = useCallback(async (params: StartParams) => {
    const recent = loadRecent();
    const draw = await drawCodewortWords(params.packId, recent);
    const g = createGame({
      words: draw.words,
      startTeam: params.startTeam,
      teamNames: params.teamNames,
      packId: draw.pack_id,
      packName: draw.pack_name,
    });
    saveRecent([...draw.words, ...recent]);
    setReviewing(false);
    setOutcome(null);
    setGame(g);
  }, []);

  const handleRematch = useCallback(async () => {
    if (!game || game.packId === null) return;
    setRematchBusy(true);
    try {
      const recent = loadRecent();
      const draw = await drawCodewortWords(game.packId, recent);
      const g = createGame({
        words: draw.words,
        teamNames: game.teamNames,
        packId: draw.pack_id,
        packName: draw.pack_name,
      });
      saveRecent([...draw.words, ...recent]);
      setReviewing(false);
      setOutcome(null);
      setGame(g);
    } finally {
      setRematchBusy(false);
    }
  }, [game]);

  const handleNewGame = useCallback(() => {
    setReviewing(false);
    setOutcome(null);
    setGame(null);
  }, []);

  const handleConfirmHandoff = useCallback(() => {
    setGame((g) => (g ? confirmHandoff(g) : g));
  }, []);

  const handleGiveClue = useCallback((clue: Clue) => {
    setGame((g) => (g ? giveClue(g, clue) : g));
  }, []);

  const handleReveal = useCallback(
    (index: number) => {
      if (!game) return;
      const card = game.cards[index];
      const next = revealCard(game, index);
      setGame(next);
      if (next.phase !== 'guessing') {
        setOutcome({
          word: card.word,
          role: card.role,
          revealerTeam: game.currentTeam,
          endedGame: next.phase === 'ended',
          winner: next.winner,
        });
        setReviewing(true);
      }
    },
    [game],
  );

  const handleEndTurn = useCallback(() => {
    setGame((g) => (g ? endTurnVoluntary(g) : g));
  }, []);

  const handleUndo = useCallback(() => {
    setGame((g) => (g && canUndo(g) ? undo(g) : g));
  }, []);

  const handleReviewUndo = useCallback(() => {
    setGame((g) => (g && canUndo(g) ? undo(g) : g));
    setReviewing(false);
    setOutcome(null);
  }, []);

  const handleReviewContinue = useCallback(() => {
    setReviewing(false);
    setOutcome(null);
    setGame((g) => (g ? { ...g, previousState: null } : g));
  }, []);

  // ---------- Render ----------
  if (!game) {
    return (
      <Layout>
        <SetupView onStart={handleStart} />
      </Layout>
    );
  }

  if (reviewing && outcome) {
    return (
      <Layout>
        <TurnResult
          outcome={outcome}
          teamNames={game.teamNames}
          canUndo={canUndo(game)}
          onUndo={handleReviewUndo}
          onContinue={handleReviewContinue}
        />
      </Layout>
    );
  }

  if (game.phase === 'handoffToSpymaster' || game.phase === 'handoffToTable') {
    return (
      <Layout>
        <HandoffScreen
          variant={game.phase === 'handoffToSpymaster' ? 'toSpymaster' : 'toTable'}
          team={game.currentTeam}
          teamNames={game.teamNames}
          onConfirm={handleConfirmHandoff}
        />
      </Layout>
    );
  }

  if (game.phase === 'spymaster') {
    return (
      <Layout>
        <SpymasterView state={game} onGiveClue={handleGiveClue} />
      </Layout>
    );
  }

  if (game.phase === 'guessing') {
    return (
      <Layout>
        <TableView
          state={game}
          onReveal={handleReveal}
          onEndTurn={handleEndTurn}
          onUndo={handleUndo}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <EndView
        state={game}
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        rematchBusy={rematchBusy}
      />
    </Layout>
  );
}

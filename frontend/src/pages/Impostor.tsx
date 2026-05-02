import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import {
  listImpostorCategories,
  getImpostorRandomWord,
} from '../api/impostor';
import type {
  ImpostorCategoryPublic,
  ImpostorRandomResponse,
} from '../types';

type GameState = 'setup' | 'reveal' | 'summary';

interface RoundData {
  word: string;
  categoryName: string;
  impostorIndex: number;
  showCategoryToImpostor: boolean;
}

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

export function Impostor() {
  // ---------- Setup-State ----------
  const [categories, setCategories] = useState<ImpostorCategoryPublic[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set());
  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [showCategoryToImpostor, setShowCategoryToImpostor] = useState(false);

  // ---------- Spiel-State ----------
  const [gameState, setGameState] = useState<GameState>('setup');
  const [round, setRound] = useState<RoundData | null>(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [revealing, setRevealing] = useState(false); // tap-and-hold aktiv
  const [seenPlayers, setSeenPlayers] = useState<Set<number>>(new Set());

  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);

  // ---------- Categories laden ----------

  useEffect(() => {
    let cancelled = false;
    listImpostorCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        // Default: alle vorausgewählt
        setSelectedCatIds(new Set(data.map((c) => c.id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Playercount-Änderung: Namen-Array anpassen ----------

  function updatePlayerCount(n: number) {
    const clamped = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    setPlayerCount(clamped);
    setPlayerNames((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push('');
      next.length = clamped;
      return next;
    });
  }

  function updatePlayerName(idx: number, name: string) {
    setPlayerNames((prev) => {
      const next = [...prev];
      next[idx] = name;
      return next;
    });
  }

  function toggleCategory(id: number) {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---------- Validierung ----------

  function validateSetup(): string | null {
    if (selectedCatIds.size === 0) return 'Bitte mindestens eine Kategorie auswählen.';
    const trimmed = playerNames.map((n) => n.trim());
    if (trimmed.some((n) => !n)) return 'Bitte alle Spielernamen eingeben.';
    const lower = trimmed.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length) return 'Spielernamen müssen eindeutig sein.';
    return null;
  }

  // ---------- Spielstart ----------

  async function startGame() {
    setStartError('');
    const err = validateSetup();
    if (err) {
      setStartError(err);
      return;
    }
    setStarting(true);
    try {
      const data: ImpostorRandomResponse = await getImpostorRandomWord(
        Array.from(selectedCatIds),
      );
      const impostorIdx = Math.floor(Math.random() * playerCount);
      setRound({
        word: data.word,
        categoryName: data.category_name,
        impostorIndex: impostorIdx,
        showCategoryToImpostor,
      });
      setCurrentPlayerIdx(0);
      setSeenPlayers(new Set());
      setRevealing(false);
      setGameState('reveal');
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Spielstart fehlgeschlagen');
    } finally {
      setStarting(false);
    }
  }

  // ---------- Reveal-Logik ----------

  const handleHoldStart = useCallback(() => setRevealing(true), []);
  const handleHoldEnd = useCallback(() => setRevealing(false), []);

  function nextPlayer() {
    setSeenPlayers((prev) => new Set(prev).add(currentPlayerIdx));
    setRevealing(false);
    if (currentPlayerIdx + 1 >= playerCount) {
      // Letzter Spieler war dran → Ready für Auflösung
      setCurrentPlayerIdx(playerCount); // markiert "fertig"
    } else {
      setCurrentPlayerIdx(currentPlayerIdx + 1);
    }
  }

  function showResolution() {
    setGameState('summary');
  }

  function newRound() {
    // Gleiche Spieler, neue Wort+Imposter-Auslosung
    setRound(null);
    setCurrentPlayerIdx(0);
    setSeenPlayers(new Set());
    setRevealing(false);
    setStartError('');
    setGameState('setup');
  }

  // ---------- Render-Helpers ----------

  const trimmedNames = playerNames.map((n) => n.trim());
  const allPlayersSeen = currentPlayerIdx >= playerCount;
  const currentName = !allPlayersSeen ? trimmedNames[currentPlayerIdx] || `Spieler ${currentPlayerIdx + 1}` : '';
  const isImpostor = round && currentPlayerIdx === round.impostorIndex;

  // ===================================================================
  // SETUP-VIEW
  // ===================================================================
  if (gameState === 'setup') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-medium mb-2">Impostor</h1>
          <p className="text-sm text-text-muted mb-8">
            Alle Spieler sehen das gleiche Wort — bis auf einen, den Impostor.
            In der Diskussion müsst ihr ihn entlarven.
          </p>

          {loadingCats ? (
            <p className="text-text-muted">Lade Kategorien...</p>
          ) : loadError ? (
            <p className="text-red-600">{loadError}</p>
          ) : categories.length === 0 ? (
            <p className="text-text-muted">Keine Kategorien verfügbar.</p>
          ) : (
            <>
              {/* ---------- Spieleranzahl ---------- */}
              <section className="mb-8">
                <h2 className="text-lg font-medium mb-3">Spieleranzahl</h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updatePlayerCount(playerCount - 1)}
                    disabled={playerCount <= MIN_PLAYERS}
                    className="w-10 h-10 rounded-lg border border-border bg-bg-secondary text-xl disabled:opacity-30"
                    aria-label="Spieler entfernen"
                  >−</button>
                  <span className="text-xl font-medium w-10 text-center" data-testid="player-count">
                    {playerCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePlayerCount(playerCount + 1)}
                    disabled={playerCount >= MAX_PLAYERS}
                    className="w-10 h-10 rounded-lg border border-border bg-bg-secondary text-xl disabled:opacity-30"
                    aria-label="Spieler hinzufügen"
                  >+</button>
                  <span className="text-xs text-text-muted ml-2">
                    {MIN_PLAYERS}–{MAX_PLAYERS} Spieler
                  </span>
                </div>
              </section>

              {/* ---------- Spielernamen ---------- */}
              <section className="mb-8">
                <h2 className="text-lg font-medium mb-3">Spielernamen</h2>
                <div className="space-y-2">
                  {Array.from({ length: playerCount }, (_, i) => (
                    <input
                      key={i}
                      type="text"
                      value={playerNames[i] ?? ''}
                      onChange={(e) => updatePlayerName(i, e.target.value)}
                      placeholder={`Spieler ${i + 1}`}
                      maxLength={40}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
                      data-testid={`player-name-${i}`}
                    />
                  ))}
                </div>
              </section>

              {/* ---------- Kategorien ---------- */}
              <section className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-medium">Kategorien</h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCatIds.size === categories.length) {
                        setSelectedCatIds(new Set());
                      } else {
                        setSelectedCatIds(new Set(categories.map((c) => c.id)));
                      }
                    }}
                    className="text-xs text-text-muted hover:text-text-primary underline"
                  >
                    {selectedCatIds.size === categories.length ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const checked = selectedCatIds.has(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                          checked
                            ? 'border-accent bg-accent/10 text-text-primary'
                            : 'border-border bg-bg-secondary text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat.id)}
                          className="sr-only"
                          data-testid={`category-${cat.id}`}
                        />
                        <span className="truncate">{cat.name}</span>
                        <span className="ml-auto text-xs text-text-muted">{cat.word_count}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              {/* ---------- Optionen ---------- */}
              <section className="mb-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCategoryToImpostor}
                    onChange={(e) => setShowCategoryToImpostor(e.target.checked)}
                    className="w-4 h-4"
                    data-testid="show-category-to-impostor"
                  />
                  <span className="text-sm">Impostor erfährt die Kategorie</span>
                </label>
                <p className="text-xs text-text-muted mt-1 ml-7">
                  Bei „aus" sieht der Impostor nur „DU BIST DER IMPOSTER".
                </p>
              </section>

              {startError && (
                <p className="text-red-600 text-sm mb-4" data-testid="start-error">{startError}</p>
              )}

              <Button onClick={startGame} disabled={starting} data-testid="start-button">
                {starting ? 'Starte...' : 'Spiel starten'}
              </Button>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // ===================================================================
  // REVEAL-VIEW (alle Spieler durch)
  // ===================================================================
  if (gameState === 'reveal' && round) {
    if (allPlayersSeen) {
      return (
        <Layout>
          <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-center">
            <h1 className="text-2xl sm:text-3xl font-medium mb-4">Alle bereit</h1>
            <p className="text-text-muted mb-8">
              Jetzt diskutiert und stimmt ab, wer der Impostor ist.
              Wenn ihr fertig seid, klickt auf Auflösung.
            </p>
            <Button onClick={showResolution} data-testid="show-resolution">
              Auflösung anzeigen
            </Button>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-sm text-text-muted text-center mb-2">
            Spieler {currentPlayerIdx + 1} von {playerCount}
          </p>
          <h1 className="text-2xl sm:text-3xl font-medium text-center mb-8" data-testid="current-player">
            {currentName}
          </h1>

          <div
            className={`relative aspect-[3/2] rounded-2xl border-2 select-none overflow-hidden mb-6 ${
              revealing
                ? 'border-accent bg-bg-secondary'
                : 'border-border bg-bg-primary'
            }`}
            onPointerDown={(e) => { e.preventDefault(); handleHoldStart(); }}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            onPointerCancel={handleHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
            data-testid="reveal-card"
            data-revealing={revealing ? 'true' : 'false'}
          >
            {revealing ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                {isImpostor ? (
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-red-600 mb-3" data-testid="impostor-label">
                      DU BIST DER IMPOSTER
                    </p>
                    {round.showCategoryToImpostor && (
                      <p className="text-base text-text-muted" data-testid="impostor-category-hint">
                        Thema: {round.categoryName}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-3xl sm:text-4xl font-medium" data-testid="player-word">
                    {round.word}
                  </p>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <p className="text-base text-text-muted mb-1">Halten zum Anzeigen</p>
                <p className="text-xs text-text-muted">
                  Loslassen versteckt das Wort wieder
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={nextPlayer}
              disabled={revealing}
              data-testid="next-player"
            >
              {currentPlayerIdx + 1 === playerCount ? 'Fertig' : 'Nächster Spieler'}
            </Button>
          </div>

          {seenPlayers.size > 0 && (
            <p className="text-xs text-text-muted text-center mt-4">
              {seenPlayers.size} von {playerCount} haben gesehen
            </p>
          )}
        </div>
      </Layout>
    );
  }

  // ===================================================================
  // SUMMARY-VIEW
  // ===================================================================
  if (gameState === 'summary' && round) {
    const impostorName =
      trimmedNames[round.impostorIndex] || `Spieler ${round.impostorIndex + 1}`;
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-medium mb-8">Auflösung</h1>

          <div className="rounded-2xl border border-border bg-bg-secondary p-6 sm:p-8 mb-6">
            <p className="text-sm text-text-muted mb-2">Der Impostor war</p>
            <p className="text-3xl sm:text-4xl font-bold text-red-600 mb-6" data-testid="impostor-name">
              {impostorName}
            </p>
            <p className="text-sm text-text-muted mb-2">Das Wort war</p>
            <p className="text-2xl sm:text-3xl font-medium mb-1" data-testid="resolved-word">
              {round.word}
            </p>
            <p className="text-sm text-text-muted">aus {round.categoryName}</p>
          </div>

          <Button onClick={newRound} data-testid="new-round">
            Neue Runde
          </Button>
        </div>
      </Layout>
    );
  }

  // Fallback (sollte nie erreicht werden)
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-text-muted">Unbekannter Spielzustand.</p>
      </div>
    </Layout>
  );
}

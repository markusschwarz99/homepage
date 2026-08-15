import { useEffect, useState } from 'react';
import type { CodewortPackPublic } from '../../types';
import type { Team, TeamNames } from '../../lib/codewort/types';
import { BOARD_SIZE } from '../../lib/codewort/engine';
import { listCodewortPacks } from '../../api/codewort';
import { Button } from '../Button';

export interface StartParams {
  packId: number;
  packName: string;
  teamNames: TeamNames;
  startTeam?: Team;
}

interface Props {
  onStart: (params: StartParams) => Promise<void>;
}

type StartChoice = 'random' | 'A' | 'B';

export function SetupView({ onStart }: Props) {
  const [packs, setPacks] = useState<CodewortPackPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [packId, setPackId] = useState<number | null>(null);
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [startChoice, setStartChoice] = useState<StartChoice>('random');

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listCodewortPacks()
      .then((data) => {
        if (cancelled) return;
        setPacks(data);
        const firstPlayable = data.find((p) => p.word_count >= BOARD_SIZE);
        if (firstPlayable) setPackId(firstPlayable.id);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    if (packId === null) return;
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    setStartError('');
    setStarting(true);
    try {
      await onStart({
        packId,
        packName: pack.name,
        teamNames: { A: nameA.trim() || 'Team A', B: nameB.trim() || 'Team B' },
        startTeam: startChoice === 'random' ? undefined : startChoice,
      });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Spielstart fehlgeschlagen');
      setStarting(false);
    }
  }

  const playablePacks = packs.filter((p) => p.word_count >= BOARD_SIZE);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-medium mb-2">Codewort</h1>
      <p className="text-sm text-text-muted mb-8">
        Zwei Teams, ein Gerät. Die Geheimdienstchefs geben Ein-Wort-Hinweise, ihre
        Teams erraten die eigenen Agenten — und meiden den Attentäter. Setzt euch zu
        viert an einen Tisch und legt los.
      </p>

      {loading ? (
        <p className="text-text-muted">Lade Wortpakete …</p>
      ) : loadError ? (
        <p className="text-red-600" data-testid="setup-load-error">
          {loadError}
        </p>
      ) : playablePacks.length === 0 ? (
        <p className="text-text-muted" data-testid="no-packs">
          Kein spielbares Wortpaket verfügbar (mindestens {BOARD_SIZE} Wörter nötig).
        </p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Wortpaket</h2>
            <div className="space-y-2" role="radiogroup" aria-label="Wortpaket">
              {packs.map((pack) => {
                const playable = pack.word_count >= BOARD_SIZE;
                const checked = packId === pack.id;
                return (
                  <label
                    key={pack.id}
                    className={[
                      'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
                      playable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed',
                      checked ? 'border-accent bg-bg-secondary' : 'border-border bg-bg-primary',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="pack"
                      checked={checked}
                      disabled={!playable}
                      onChange={() => setPackId(pack.id)}
                      data-testid={`pack-${pack.id}`}
                    />
                    <span className="flex-1 truncate">{pack.name}</span>
                    <span className="text-xs text-text-muted">
                      {pack.word_count} Wörter{!playable && ' – zu wenige'}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Teamnamen (optional)</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                placeholder="Team A"
                maxLength={30}
                data-testid="team-a-name"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
              <input
                type="text"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                placeholder="Team B"
                maxLength={30}
                data-testid="team-b-name"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Startteam (beginnt, hat 9 Agenten)</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Startteam">
              {(
                [
                  ['random', 'Zufällig'],
                  ['A', nameA.trim() || 'Team A'],
                  ['B', nameB.trim() || 'Team B'],
                ] as [StartChoice, string][]
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={[
                    'px-3 py-2 rounded-lg border text-sm cursor-pointer',
                    startChoice === value
                      ? 'border-accent bg-bg-secondary'
                      : 'border-border bg-bg-primary',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="startteam"
                    checked={startChoice === value}
                    onChange={() => setStartChoice(value)}
                    className="sr-only"
                    data-testid={`start-${value}`}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {startError && (
            <p className="text-red-600 text-sm mb-4" data-testid="start-error">
              {startError}
            </p>
          )}

          <Button onClick={handleStart} disabled={starting || packId === null} data-testid="start-game">
            {starting ? 'Starte …' : 'Partie starten'}
          </Button>
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { CodewortCard } from '../components/codewort/CodewortCard';
import { ScoreBarView, ClueBannerView } from '../components/codewort/parts';
import { TurnHistory } from '../components/codewort/TurnHistory';
import {
  CodewortRoomError,
  chooseCodewortTeam,
  codewortRoomAction,
  createCodewortRoom,
  getCodewortRoom,
  giveCodewortClue,
  joinCodewortRoom,
  listCodewortPacks,
  removeCodewortRoomPlayer,
  revealCodewortCard,
  updateCodewortRoomPack,
} from '../api/codewort';
import { BOARD_SIZE } from '../lib/codewort/engine';
import { ROLE_STYLE } from '../lib/codewort/presentation';
import type { Team } from '../lib/codewort/types';
import type { CodewortPackPublic, CodewortRoom, CodewortRoomPlayer } from '../types';

const POLL_MS = 2000;
const NAME_KEY = 'codewort:online:name';
const tokenKey = (code: string) => `codewort:online:token:${code}`;
const TEAMS: Team[] = ['A', 'B'];

// localStorage kann in privaten Fenstern werfen → immer defensiv.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignorieren — Spiel funktioniert auch ohne Persistenz
  }
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';

function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <Layout>
      <div className={`${wide ? 'max-w-3xl px-3 sm:px-6' : 'max-w-2xl px-4 sm:px-8'} mx-auto py-8 sm:py-12`}>
        {children}
      </div>
    </Layout>
  );
}

// ===================================================================
// START: Raum erstellen oder Code eingeben
// ===================================================================

export function CodewortOnlineStart() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => readStorage(NAME_KEY) ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await createCodewortRoom(name);
      writeStorage(NAME_KEY, name.trim());
      writeStorage(tokenKey(res.code), res.token);
      navigate(`/codewort/online/${res.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raum konnte nicht erstellt werden');
      setBusy(false);
    }
  }

  function goToRoom(e: FormEvent) {
    e.preventDefault();
    navigate(`/codewort/online/${code.trim().toUpperCase()}`);
  }

  return (
    <Page>
      <h1 className="text-2xl sm:text-3xl font-medium mb-2">Codewort online</h1>
      <p className="text-sm text-text-muted mb-8">
        Jeder spielt am eigenen Handy: Die Chefs sehen den Schlüssel, die Ermittler nur
        die Wörter. Einer erstellt den Raum, die anderen treten mit dem Code bei.{' '}
        <Link to="/codewort" className="underline hover:text-text-primary">
          Lieber mit einem Gerät?
        </Link>
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-3">Raum erstellen</h2>
        <form onSubmit={create} className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            maxLength={40}
            required
            className={inputClass}
            data-testid="create-name"
          />
          <Button type="submit" disabled={busy || !name.trim()} data-testid="create-button">
            {busy ? 'Erstelle...' : 'Erstellen'}
          </Button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Raum beitreten</h2>
        <form onSubmit={goToRoom} className="flex flex-col sm:flex-row gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Raum-Code, z.B. KXBT"
            maxLength={4}
            required
            className={`${inputClass} uppercase tracking-widest`}
            data-testid="join-code"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={code.trim().length !== 4}
            data-testid="join-code-button"
          >
            Weiter
          </Button>
        </form>
      </section>
    </Page>
  );
}

// ===================================================================
// RAUM
// ===================================================================

export function CodewortOnlineRoom() {
  const { code = '' } = useParams();
  // key erzwingt frischen State, falls man direkt zwischen Räumen wechselt
  return <Room key={code} code={code.toUpperCase()} />;
}

type Act = (request: (t: string) => Promise<CodewortRoom | void>) => Promise<boolean>;

function Room({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(() => readStorage(tokenKey(code)));
  const [room, setRoom] = useState<CodewortRoom | null>(null);
  const [notice, setNotice] = useState('');
  const [connError, setConnError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  // Nur Antworten übernehmen, die neuer sind als die zuletzt angewendete —
  // sonst überschreibt ein langsamer Poll das Ergebnis einer Aktion.
  const seq = useRef(0);
  const applied = useRef(0);

  const leave = useCallback(
    (message: string) => {
      writeStorage(tokenKey(code), null);
      setToken(null);
      setRoom(null);
      setNotice(message);
    },
    [code],
  );

  const run = useCallback(async (request: () => Promise<CodewortRoom | void>) => {
    const n = ++seq.current;
    const res = await request();
    if (res && n > applied.current) {
      applied.current = n;
      setRoom(res);
    }
  }, []);

  // ---------- Polling ----------
  // Rauswurf/Raum-weg nur hier erkennen: GET liefert 403 ausschließlich bei
  // ungültigem Token (Aktionen können auch "nicht dran" → 403 sein).
  useEffect(() => {
    if (!token) return;
    const t = token;
    let cancelled = false;
    async function poll() {
      if (document.visibilityState === 'hidden') return;
      try {
        await run(() => getCodewortRoom(code, t));
        if (!cancelled) setConnError('');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof CodewortRoomError && err.status === 404) {
          leave('Diesen Raum gibt es nicht (mehr).');
        } else if (err instanceof CodewortRoomError && err.status === 403) {
          leave('Du bist nicht mehr in diesem Raum.');
        } else {
          setConnError('Verbindung unterbrochen — versuche es weiter …');
        }
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [code, token, run, leave]);

  const act: Act = async (request) => {
    if (!token) return false;
    setActionError('');
    setBusy(true);
    try {
      await run(() => request(token));
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <JoinForm
        code={code}
        notice={notice}
        onJoined={(t) => {
          writeStorage(tokenKey(code), t);
          setNotice('');
          setToken(t);
        }}
      />
    );
  }

  if (!room) {
    return (
      <Page>
        <p className="text-text-muted">{connError || 'Verbinde...'}</p>
      </Page>
    );
  }

  const me = room.players.find((p) => p.id === room.me)!;
  const isHost = room.me === room.host_id;
  const props = { room, me, isHost, busy, act };

  return (
    <Page wide={room.phase !== 'lobby'}>
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h1 className="text-xl sm:text-3xl font-medium">Codewort online</h1>
        <span className="text-sm text-text-muted whitespace-nowrap">
          Raum <span className="font-mono tracking-widest" data-testid="room-code">{room.code}</span>
          {room.round_number > 0 && ` · Partie ${room.round_number}`}
        </span>
      </div>

      {connError && <p className="text-sm text-text-muted mb-4">{connError}</p>}

      {room.phase === 'lobby' ? (
        <Lobby
          {...props}
          onLeave={() =>
            act(async (t) => {
              await removeCodewortRoomPlayer(code, t, room.me);
              leave('Du hast den Raum verlassen.');
            })
          }
        />
      ) : (
        <Game {...props} />
      )}

      {actionError && (
        <p className="text-red-600 text-sm mt-4" data-testid="room-error">{actionError}</p>
      )}
    </Page>
  );
}

// ---------- Beitreten ----------

function JoinForm({
  code,
  notice,
  onJoined,
}: {
  code: string;
  notice: string;
  onJoined: (token: string) => void;
}) {
  const [name, setName] = useState(() => readStorage(NAME_KEY) ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await joinCodewortRoom(code, name);
      writeStorage(NAME_KEY, name.trim());
      onJoined(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitreten fehlgeschlagen');
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="text-2xl sm:text-3xl font-medium mb-2">Codewort online</h1>
      <p className="text-sm text-text-muted mb-8">
        Raum <span className="font-mono tracking-widest">{code}</span> beitreten
      </p>
      {notice && <p className="text-sm mb-4" data-testid="room-notice">{notice}</p>}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name"
          maxLength={40}
          required
          className={inputClass}
          data-testid="join-name"
        />
        <Button type="submit" disabled={busy || !name.trim()} data-testid="join-button">
          {busy ? 'Trete bei...' : 'Beitreten'}
        </Button>
      </form>
      {error && <p className="text-red-600 text-sm mt-2" data-testid="join-error">{error}</p>}
      <p className="text-sm mt-8">
        <Link to="/codewort/online" className="underline text-text-muted hover:text-text-primary">
          Anderen Raum / neuen Raum erstellen
        </Link>
      </p>
    </Page>
  );
}

// ---------- Lobby ----------

interface RoomProps {
  room: CodewortRoom;
  me: CodewortRoomPlayer;
  isHost: boolean;
  busy: boolean;
  act: Act;
}

/** Client-seitiger Vorab-Check; der Server prüft dasselbe noch einmal. */
function teamsReady(room: CodewortRoom): boolean {
  if (room.players.some((p) => p.team === null)) return false;
  return TEAMS.every((t) => {
    const members = room.players.filter((p) => p.team === t);
    return members.filter((p) => p.spymaster).length === 1 && members.some((p) => !p.spymaster);
  });
}

function Lobby({ room, me, isHost, busy, act, onLeave }: RoomProps & { onLeave: () => void }) {
  const [packs, setPacks] = useState<CodewortPackPublic[]>([]);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/codewort/online/${room.code}`;
  const ready = teamsReady(room);
  const unassigned = room.players.filter((p) => p.team === null);

  useEffect(() => {
    if (!isHost) return;
    listCodewortPacks()
      .then((data) => setPacks(data.filter((p) => p.word_count >= BOARD_SIZE)))
      .catch(() => setPacks([]));
  }, [isHost]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar (z.B. ohne HTTPS) — Link steht ja sichtbar da
    }
  }

  const choose = (team: Team, spymaster: boolean) =>
    act((t) => chooseCodewortTeam(room.code, t, team, spymaster));

  const kickButton = (p: CodewortRoomPlayer) =>
    isHost && p.id !== room.me ? (
      <button
        type="button"
        onClick={() => act((t) => removeCodewortRoomPlayer(room.code, t, p.id))}
        className="text-xs text-text-muted hover:text-red-600 underline"
        data-testid={`kick-${p.id}`}
      >
        Entfernen
      </button>
    ) : null;

  const nameTag = (p: CodewortRoomPlayer) => (
    <>
      <span className="truncate">{p.name}</span>
      {p.id === room.host_id && <span className="text-xs text-text-muted">Host</span>}
      {p.id === room.me && <span className="text-xs text-text-muted">(du)</span>}
    </>
  );

  return (
    <>
      <section className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6 mb-6 text-center">
        <p className="text-sm text-text-muted mb-1">Raum-Code</p>
        <p className="text-4xl font-mono font-medium tracking-[0.3em] mb-3">{room.code}</p>
        <p className="text-xs text-text-muted break-all mb-3">{link}</p>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? 'Kopiert!' : 'Link kopieren'}
        </Button>
      </section>

      <h2 className="text-lg font-medium mb-1">
        Teams ({room.players.length}/{room.max_players})
      </h2>
      <p className="text-xs text-text-muted mb-3">
        Jedes Team braucht genau einen Chef und mindestens einen Ermittler.
      </p>

      <div data-testid="player-list">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {TEAMS.map((team) => {
            const style = ROLE_STYLE[team === 'A' ? 'teamA' : 'teamB'];
            const chef = room.players.find((p) => p.team === team && p.spymaster);
            const operatives = room.players.filter((p) => p.team === team && !p.spymaster);
            const iAmChef = me.team === team && me.spymaster;
            const iAmOperative = me.team === team && !me.spymaster;
            return (
              <section
                key={team}
                className="rounded-xl border border-border p-3"
                data-testid={`team-${team}`}
              >
                <h3 className="flex items-center gap-2 font-medium mb-2">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white ${style.chip}`}
                    aria-hidden="true"
                  >
                    {style.symbol}
                  </span>
                  {room.team_names[team]}
                </h3>

                <p className="text-xs text-text-muted mb-1">Chef</p>
                <div className="flex items-center gap-2 text-sm min-h-8 mb-2">
                  {chef ? (
                    <>
                      {nameTag(chef)}
                      <span className="ml-auto">{kickButton(chef)}</span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => choose(team, true)}
                      disabled={busy}
                      className="text-sm underline text-text-muted hover:text-text-primary"
                      data-testid={`join-${team}-chef`}
                    >
                      Chef werden
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-muted mb-1">Ermittler</p>
                <ul className="text-sm space-y-1 mb-2">
                  {operatives.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      {nameTag(p)}
                      <span className="ml-auto">{kickButton(p)}</span>
                    </li>
                  ))}
                  {operatives.length === 0 && <li className="text-text-muted">—</li>}
                </ul>
                {!iAmOperative && (
                  <button
                    type="button"
                    onClick={() => choose(team, false)}
                    disabled={busy}
                    className="text-sm underline text-text-muted hover:text-text-primary"
                    data-testid={`join-${team}-operative`}
                  >
                    {iAmChef ? 'Doch lieber Ermittler' : 'Als Ermittler beitreten'}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        {unassigned.length > 0 && (
          <div className="mb-6 text-sm">
            <p className="text-xs text-text-muted mb-1">Noch ohne Team</p>
            <ul className="space-y-1">
              {unassigned.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  {nameTag(p)}
                  <span className="ml-auto">{kickButton(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isHost ? (
        <>
          <section className="mb-6 mt-6">
            <h2 className="text-lg font-medium mb-3">Wortpaket</h2>
            <div className="space-y-2" role="radiogroup" aria-label="Wortpaket">
              {packs.map((pack) => (
                <label
                  key={pack.id}
                  className={[
                    'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer',
                    room.pack_id === pack.id ? 'border-accent bg-bg-secondary' : 'border-border',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="pack"
                    checked={room.pack_id === pack.id}
                    disabled={busy}
                    onChange={() => act((t) => updateCodewortRoomPack(room.code, t, pack.id))}
                  />
                  <span className="flex-1 truncate">{pack.name}</span>
                  <span className="text-xs text-text-muted">{pack.word_count} Wörter</span>
                </label>
              ))}
            </div>
          </section>

          <Button
            onClick={() => act((t) => codewortRoomAction(room.code, t, 'start'))}
            disabled={busy || !ready}
            data-testid="start-button"
          >
            Partie starten
          </Button>
          {!ready && (
            <p className="text-xs text-text-muted mt-2">
              Erst wenn alle in einem Team sind und jedes Team einen Chef und mindestens einen
              Ermittler hat.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted mb-1 mt-6" data-testid="waiting-for-host">
            Warte, bis der Host die Partie startet …
          </p>
          <p className="text-xs text-text-muted mb-6">Wortpaket: {room.pack_name}</p>
          <Button variant="secondary" onClick={onLeave} disabled={busy}>
            Raum verlassen
          </Button>
        </>
      )}

      <details className="mt-8 rounded-xl border border-border bg-bg-secondary">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Spielregeln
        </summary>
        <div className="px-4 pb-4 text-sm text-text-muted space-y-2 leading-relaxed">
          <p>
            25 Wörter liegen aus — 9 bzw. 8 gehören den Teams, 7 sind neutral, einer ist der
            Attentäter. Nur die Chefs sehen die Zuordnung auf ihrem Handy.
          </p>
          <p>
            Der Chef am Zug gibt einen Hinweis aus <strong>genau einem Wort und einer Zahl</strong>.
            Seine Ermittler decken dann auf ihren Handys Karten auf — erlaubt sind{' '}
            <strong>Zahl + 1</strong> Versuche, bei <strong>0</strong> unbegrenzt viele.
          </p>
          <p>
            Neutrale oder gegnerische Karte beendet den Zug, der <strong>Attentäter</strong> die
            Partie. Wer zuerst alle eigenen Agenten gefunden hat, gewinnt.
          </p>
        </div>
      </details>
    </>
  );
}

// ---------- Partie ----------

function revealMessage(room: CodewortRoom): string {
  const last = room.game!.last_reveal!;
  const names = room.team_names;
  switch (last.end_reason) {
    case null:
      return `Treffer — ${names[last.team]} darf weiter raten.`;
    case 'assassin':
      return `Attentäter! ${names[last.team]} verliert die Partie.`;
    case 'game_end':
      return 'Das war der letzte Agent — Partie entschieden.';
    case 'out_of_guesses':
      return 'Treffer — Versuche aufgebraucht, der Zug ist beendet.';
    default:
      return last.role === 'neutral'
        ? 'Neutrale Karte — der Zug ist beendet.'
        : 'Karte des Gegenteams — der Zug ist beendet.';
  }
}

function ClueForm({ room, busy, act }: Pick<RoomProps, 'room' | 'busy' | 'act'>) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const w = word.trim();
    if (!w) {
      setError('Bitte ein Hinweiswort eingeben.');
      return;
    }
    if (/\s/.test(w)) {
      setError('Ein Hinweis besteht aus genau einem Wort.');
      return;
    }
    setError('');
    if (await act((t) => giveCodewortClue(room.code, t, w, count))) setWord('');
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-accent bg-bg-secondary p-4 mb-4">
      <h2 className="text-sm font-medium mb-3">Du bist dran: Hinweis abgeben</h2>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1">
          <span className="block text-xs text-text-muted mb-1">Hinweiswort (ein Wort)</span>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={40}
            data-testid="clue-word-input"
            className={inputClass}
          />
        </label>
        <label className="w-full sm:w-28">
          <span className="block text-xs text-text-muted mb-1">Zahl (0 = unbegr.)</span>
          <input
            type="number"
            min={0}
            max={9}
            value={count}
            onChange={(e) => setCount(Math.min(9, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
            data-testid="clue-count-input"
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={busy} data-testid="give-clue">
          Hinweis geben
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2" data-testid="clue-error">{error}</p>}
    </form>
  );
}

function Game({ room, me, isHost, busy, act }: RoomProps) {
  const game = room.game!;
  const names = room.team_names;
  const [selected, setSelected] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const current = game.current_team;
  const chefName = room.players.find((p) => p.team === current && p.spymaster)?.name ?? '?';
  const isMyTurn = me.team === current;
  const canClue = room.phase === 'clue' && isMyTurn && me.spymaster;
  const canGuess = room.phase === 'guessing' && isMyTurn && !me.spymaster;
  // Auswahl verfällt, sobald man nicht mehr raten darf oder die Karte offen ist.
  const sel = canGuess && selected !== null && !game.cards[selected].revealed ? selected : null;
  const ended = room.phase === 'ended';

  async function confirmReveal() {
    if (sel === null) return;
    setSelected(null);
    await act((t) => revealCodewortCard(room.code, t, sel));
  }

  const myRole = me.team
    ? `${me.spymaster ? 'Chef' : 'Ermittler'} · ${names[me.team]}`
    : 'Zuschauer';
  const last = game.last_reveal;

  return (
    <>
      <p className="text-sm text-text-muted mb-3" data-testid="my-role">
        Du: {myRole}
      </p>

      {ended ? (
        <div className="text-center mb-4">
          <p className="text-sm text-text-muted mb-1">Sieger</p>
          <p className="text-3xl font-semibold mb-1" data-testid="winner">
            {game.winner ? names[game.winner] : '—'}
          </p>
          <p className="text-sm text-text-muted" data-testid="win-reason">
            {game.win_reason === 'assassin'
              ? 'Das Gegenteam hat den Attentäter aufgedeckt.'
              : 'Alle eigenen Agenten wurden gefunden.'}
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <ScoreBarView remaining={game.remaining} activeTeam={current} teamNames={names} />
        </div>
      )}

      {last && (
        <div
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 mb-3 text-sm"
          data-testid="last-reveal"
        >
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium uppercase ${ROLE_STYLE[last.role].swatch}`}
          >
            <span aria-hidden="true">{ROLE_STYLE[last.role].symbol}</span>
            {last.word}
          </span>
          <span className="min-w-0">{revealMessage(room)}</span>
        </div>
      )}

      {room.phase === 'clue' &&
        (canClue ? (
          <ClueForm room={room} busy={busy} act={act} />
        ) : (
          <p className="text-sm mb-4 rounded-lg border border-border px-4 py-3" data-testid="turn-status">
            {chefName} ({names[current]}) überlegt sich einen Hinweis …
          </p>
        ))}

      {room.phase === 'guessing' && game.clue && (
        <div className="mb-3">
          <ClueBannerView clue={game.clue} remaining={game.guesses_remaining ?? Infinity} />
          <p className="text-sm text-text-muted mt-2" data-testid="turn-status">
            {canGuess
              ? 'Ihr seid dran — Karte antippen und bestätigen.'
              : `${names[current]} rät …`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4" data-testid="board-grid">
        {game.cards.map((card, i) => (
          <CodewortCard
            key={i}
            index={i}
            word={card.word}
            role={card.role}
            revealed={card.revealed}
            dimmed={card.role !== null}
            interactive={canGuess && !card.revealed}
            selected={sel === i}
            onSelect={setSelected}
            teamNames={names}
          />
        ))}
      </div>

      {/* Zweistufige Bestätigung (INV-15) */}
      {sel !== null && (
        <div
          className="rounded-xl border border-accent bg-bg-secondary p-3 mb-4 flex flex-wrap items-center gap-3"
          data-testid="confirm-bar"
        >
          <span className="text-sm flex-1 min-w-0">
            „<span className="font-medium">{game.cards[sel].word}</span>" aufdecken?
          </span>
          <Button variant="secondary" onClick={() => setSelected(null)} data-testid="cancel-reveal">
            Abbrechen
          </Button>
          <Button onClick={confirmReveal} disabled={busy} data-testid="confirm-reveal">
            Aufdecken
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canGuess && (
          <Button
            variant="secondary"
            onClick={() => act((t) => codewortRoomAction(room.code, t, 'end-turn'))}
            disabled={busy || game.guesses_made < 1}
            data-testid="end-turn"
          >
            Zug beenden
          </Button>
        )}
        {isHost && ended && (
          <Button
            onClick={() => act((t) => codewortRoomAction(room.code, t, 'start'))}
            disabled={busy}
            data-testid="rematch"
          >
            Revanche
          </Button>
        )}
        {isHost && (
          <Button
            variant="secondary"
            onClick={() => act((t) => codewortRoomAction(room.code, t, 'lobby'))}
            disabled={busy}
            data-testid="back-to-lobby"
          >
            {ended ? 'Zur Lobby' : 'Partie abbrechen'}
          </Button>
        )}
        {!isHost && ended && <p className="text-sm text-text-muted">Warte auf den Host …</p>}
        {!ended && (
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="ml-auto text-sm text-text-muted hover:text-text-primary underline"
            data-testid="toggle-history"
          >
            {showHistory ? 'Verlauf ausblenden' : 'Verlauf'}
          </button>
        )}
      </div>

      {(showHistory || ended) && (
        <div className="mt-4">
          <TurnHistory state={{ history: game.history, teamNames: names }} />
        </div>
      )}
    </>
  );
}

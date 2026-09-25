import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import {
  ImpostorRoomError,
  createImpostorRoom,
  getImpostorRoom,
  impostorRoomAction,
  joinImpostorRoom,
  listImpostorCategories,
  removeImpostorRoomPlayer,
  updateImpostorRoomSettings,
  voteImpostorRoom,
} from '../api/impostor';
import type { ImpostorCategoryPublic, ImpostorRoom } from '../types';

const POLL_MS = 2000;
const NAME_KEY = 'impostor:online:name';
const tokenKey = (code: string) => `impostor:online:token:${code}`;

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

function Page({ children }: { children: ReactNode }) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">{children}</div>
    </Layout>
  );
}

// ===================================================================
// START: Raum erstellen oder Code eingeben
// ===================================================================

export function ImpostorOnlineStart() {
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
      const res = await createImpostorRoom(name);
      writeStorage(NAME_KEY, name.trim());
      writeStorage(tokenKey(res.code), res.token);
      navigate(`/impostor/online/${res.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raum konnte nicht erstellt werden');
      setBusy(false);
    }
  }

  function goToRoom(e: FormEvent) {
    e.preventDefault();
    navigate(`/impostor/online/${code.trim().toUpperCase()}`);
  }

  return (
    <Page>
      <h1 className="text-2xl sm:text-3xl font-medium mb-2">Impostor online</h1>
      <p className="text-sm text-text-muted mb-8">
        Jeder spielt am eigenen Handy. Einer erstellt den Raum, die anderen treten
        mit dem Code bei. Diskutiert wird vor Ort oder im Call.{' '}
        <Link to="/impostor" className="underline hover:text-text-primary">
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

export function ImpostorOnlineRoom() {
  const { code = '' } = useParams();
  // key erzwingt frischen State, falls man direkt zwischen Räumen wechselt
  return <Room key={code} code={code.toUpperCase()} />;
}

function Room({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(() => readStorage(tokenKey(code)));
  const [room, setRoom] = useState<ImpostorRoom | null>(null);
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

  const run = useCallback(
    async (request: () => Promise<ImpostorRoom | void>) => {
      const n = ++seq.current;
      const res = await request();
      if (res && n > applied.current) {
        applied.current = n;
        setRoom(res);
      }
    },
    [],
  );

  // ---------- Polling ----------
  // Rauswurf/Raum-weg nur hier erkennen: GET liefert 403 ausschließlich bei
  // ungültigem Token (Aktionen können auch "nur Host" → 403 sein).
  useEffect(() => {
    if (!token) return;
    const t = token;
    let cancelled = false;
    async function poll() {
      if (document.visibilityState === 'hidden') return;
      try {
        await run(() => getImpostorRoom(code, t));
        if (!cancelled) setConnError('');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImpostorRoomError && err.status === 404) {
          leave('Diesen Raum gibt es nicht (mehr).');
        } else if (err instanceof ImpostorRoomError && err.status === 403) {
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

  async function act(request: (t: string) => Promise<ImpostorRoom | void>) {
    if (!token) return;
    setActionError('');
    setBusy(true);
    try {
      await run(() => request(token));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

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

  const isHost = room.me === room.host_id;
  const nameOf = (id: number | null) => room.players.find((p) => p.id === id)?.name ?? '?';
  const props = { room, isHost, nameOf, busy, act };

  return (
    <Page>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-medium">Impostor online</h1>
        <span className="text-sm text-text-muted">
          Raum <span className="font-mono tracking-widest" data-testid="room-code">{room.code}</span>
          {room.round_number > 0 && ` · Runde ${room.round_number}`}
        </span>
      </div>

      {connError && <p className="text-sm text-text-muted mb-4">{connError}</p>}

      {room.phase === 'lobby' && (
        <Lobby
          {...props}
          onLeave={() =>
            act(async (t) => {
              await removeImpostorRoomPlayer(code, t, room.me);
              leave('Du hast den Raum verlassen.');
            })
          }
        />
      )}
      {room.phase === 'reveal' && <Reveal {...props} />}
      {room.phase === 'voting' && <Voting {...props} />}
      {room.phase === 'result' && <Result {...props} />}

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
      const res = await joinImpostorRoom(code, name);
      writeStorage(NAME_KEY, name.trim());
      onJoined(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitreten fehlgeschlagen');
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="text-2xl sm:text-3xl font-medium mb-2">Impostor online</h1>
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
        <Link to="/impostor/online" className="underline text-text-muted hover:text-text-primary">
          Anderen Raum / neuen Raum erstellen
        </Link>
      </p>
    </Page>
  );
}

// ---------- Phasen ----------

interface PhaseProps {
  room: ImpostorRoom;
  isHost: boolean;
  nameOf: (id: number | null) => string;
  busy: boolean;
  act: (request: (t: string) => Promise<ImpostorRoom | void>) => void;
}

function PlayerList({
  room,
  marked,
  renderAction,
}: {
  room: ImpostorRoom;
  marked?: number[];
  renderAction?: (id: number) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-border-light border border-border rounded-lg mb-6" data-testid="player-list">
      {room.players.map((p) => (
        <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
          <span>{p.name}</span>
          {p.id === room.host_id && <span className="text-xs text-text-muted">Host</span>}
          {p.id === room.me && <span className="text-xs text-text-muted">(du)</span>}
          {marked?.includes(p.id) && <span className="text-xs" aria-label="erledigt">✓</span>}
          <span className="ml-auto">{renderAction?.(p.id)}</span>
        </li>
      ))}
    </ul>
  );
}

function Lobby({ room, isHost, nameOf, busy, act, onLeave }: PhaseProps & { onLeave: () => void }) {
  const [categories, setCategories] = useState<ImpostorCategoryPublic[]>([]);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/impostor/online/${room.code}`;
  const selected = new Set(room.settings.category_ids);
  const enough = room.players.length >= room.min_players;

  useEffect(() => {
    listImpostorCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar (z.B. ohne HTTPS) — Link steht ja sichtbar da
    }
  }

  function toggleCategory(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) return; // mind. eine Kategorie
    act((t) => updateImpostorRoomSettings(room.code, t, { category_ids: Array.from(next) }));
  }

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

      <h2 className="text-lg font-medium mb-3">
        Spieler ({room.players.length}/{room.max_players})
      </h2>
      <PlayerList
        room={room}
        renderAction={(id) =>
          isHost && id !== room.me ? (
            <button
              type="button"
              onClick={() => act((t) => removeImpostorRoomPlayer(room.code, t, id))}
              className="text-xs text-text-muted hover:text-red-600 underline"
              data-testid={`kick-${id}`}
            >
              Entfernen
            </button>
          ) : null
        }
      />

      {isHost ? (
        <>
          <section className="mb-6">
            <h2 className="text-lg font-medium mb-3">Kategorien</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const checked = selected.has(cat.id);
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
                      disabled={busy}
                      className="sr-only"
                    />
                    <span className="truncate">{cat.name}</span>
                    <span className="ml-auto text-xs text-text-muted">{cat.word_count}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="mb-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={room.settings.show_category_to_impostor}
                onChange={(e) =>
                  act((t) =>
                    updateImpostorRoomSettings(room.code, t, {
                      show_category_to_impostor: e.target.checked,
                    }),
                  )
                }
                disabled={busy}
                className="w-4 h-4"
              />
              <span className="text-sm">Impostor erfährt die Kategorie</span>
            </label>
          </section>

          <Button
            onClick={() => act((t) => impostorRoomAction(room.code, t, 'start'))}
            disabled={busy || !enough}
            data-testid="start-button"
          >
            Runde starten
          </Button>
          {!enough && (
            <p className="text-xs text-text-muted mt-2">
              Mindestens {room.min_players} Spieler nötig.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted mb-2" data-testid="waiting-for-host">
            Warte, bis {nameOf(room.host_id)} die Runde startet …
          </p>
          <p className="text-xs text-text-muted mb-6">
            Kategorien:{' '}
            {categories.filter((c) => selected.has(c.id)).map((c) => c.name).join(', ') || '…'}
          </p>
          <Button variant="secondary" onClick={onLeave} disabled={busy}>
            Raum verlassen
          </Button>
        </>
      )}
    </>
  );
}

function Reveal({ room, isHost, nameOf, busy, act }: PhaseProps) {
  const [revealing, setRevealing] = useState(false);
  const role = room.role!;
  const hide = () => setRevealing(false);

  return (
    <>
      <div
        className={`relative aspect-[3/2] rounded-2xl border-2 select-none overflow-hidden mb-4 ${
          revealing ? 'border-accent bg-bg-secondary' : 'border-border bg-bg-primary'
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          setRevealing(true);
        }}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onContextMenu={(e) => e.preventDefault()}
        data-testid="reveal-card"
        data-revealing={revealing ? 'true' : 'false'}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          {!revealing ? (
            <>
              <p className="text-base text-text-muted mb-1">Halten zum Anzeigen</p>
              <p className="text-xs text-text-muted">Loslassen versteckt es wieder</p>
            </>
          ) : role.is_impostor ? (
            <>
              <p className="text-3xl sm:text-4xl font-bold text-red-600 mb-3" data-testid="impostor-label">
                DU BIST DER IMPOSTOR
              </p>
              {role.category_name && (
                <p className="text-base text-text-muted">Thema: {role.category_name}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-medium mb-2" data-testid="player-word">
                {role.word}
              </p>
              <p className="text-sm text-text-muted">{role.category_name}</p>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-center mb-6">
        <span className="font-medium" data-testid="starter-name">{nameOf(room.starter_id)}</span>{' '}
        beginnt. Reihum sagt jeder ein Wort zum Begriff — dann diskutiert ihr.
      </p>

      <PlayerList room={room} />

      {isHost ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => act((t) => impostorRoomAction(room.code, t, 'voting'))}
            disabled={busy}
            data-testid="start-voting"
          >
            Abstimmung starten
          </Button>
          <Button
            variant="secondary"
            onClick={() => act((t) => impostorRoomAction(room.code, t, 'lobby'))}
            disabled={busy}
          >
            Runde abbrechen
          </Button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          {nameOf(room.host_id)} startet die Abstimmung, wenn ihr so weit seid.
        </p>
      )}
    </>
  );
}

function Voting({ room, isHost, busy, act }: PhaseProps) {
  return (
    <>
      <h2 className="text-lg font-medium mb-1">Wer ist der Impostor?</h2>
      <p className="text-sm text-text-muted mb-4">
        {room.voted_ids.length} von {room.players.length} haben abgestimmt. Du kannst
        deine Stimme ändern, bis alle abgestimmt haben.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {room.players
          .filter((p) => p.id !== room.me)
          .map((p) => {
            const chosen = room.my_vote === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => act((t) => voteImpostorRoom(room.code, t, p.id))}
                disabled={busy}
                className={`px-3 py-3 rounded-lg border text-sm transition-colors ${
                  chosen
                    ? 'border-accent bg-accent text-bg-primary'
                    : 'border-border bg-bg-secondary hover:border-text-muted'
                }`}
                data-testid={`vote-${p.id}`}
                aria-pressed={chosen}
              >
                {p.name}
              </button>
            );
          })}
      </div>

      <PlayerList room={room} marked={room.voted_ids} />

      {isHost && (
        <Button
          variant="secondary"
          onClick={() => act((t) => impostorRoomAction(room.code, t, 'finish'))}
          disabled={busy}
          data-testid="finish-voting"
        >
          Abstimmung beenden
        </Button>
      )}
    </>
  );
}

function Result({ room, isHost, nameOf, busy, act }: PhaseProps) {
  const result = room.result!;
  const tally = room.players
    .map((p) => ({
      ...p,
      voters: result.votes.filter((v) => v.target_id === p.id).map((v) => nameOf(v.voter_id)),
    }))
    .sort((a, b) => b.voters.length - a.voters.length);

  return (
    <>
      <div className="rounded-2xl border border-border bg-bg-secondary p-6 sm:p-8 mb-6 text-center">
        <p className="text-xl font-medium mb-6" data-testid="result-caught">
          {result.caught ? 'Impostor erwischt!' : 'Der Impostor ist entkommen!'}
        </p>
        <p className="text-sm text-text-muted mb-2">Der Impostor war</p>
        <p className="text-3xl sm:text-4xl font-bold text-red-600 mb-6" data-testid="result-impostor">
          {nameOf(result.impostor_id)}
        </p>
        <p className="text-sm text-text-muted mb-2">Das Wort war</p>
        <p className="text-2xl sm:text-3xl font-medium mb-1" data-testid="result-word">
          {result.word}
        </p>
        <p className="text-sm text-text-muted">aus {result.category_name}</p>
      </div>

      <h2 className="text-lg font-medium mb-3">Stimmen</h2>
      <ul className="divide-y divide-border-light border border-border rounded-lg mb-6">
        {tally.map((p) => (
          <li key={p.id} className="flex items-baseline gap-2 px-3 py-2 text-sm">
            <span className={p.id === result.impostor_id ? 'text-red-600 font-medium' : ''}>
              {p.name}
            </span>
            <span className="text-xs text-text-muted truncate">{p.voters.join(', ')}</span>
            <span className="ml-auto font-medium">{p.voters.length}</span>
          </li>
        ))}
      </ul>

      {isHost ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => act((t) => impostorRoomAction(room.code, t, 'start'))}
            disabled={busy}
            data-testid="next-round"
          >
            Nächste Runde
          </Button>
          <Button
            variant="secondary"
            onClick={() => act((t) => impostorRoomAction(room.code, t, 'lobby'))}
            disabled={busy}
            data-testid="back-to-lobby"
          >
            Zur Lobby
          </Button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">Warte auf {nameOf(room.host_id)} …</p>
      )}
    </>
  );
}

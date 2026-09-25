"""
Codewort-Spiel — Online-Modus (jeder Spieler am eigenen Gerät).

Räume leben NUR im Speicher des Backend-Prozesses (Single-Uvicorn) — kein
DB-State, keine Migration. Ein Restart/Deploy beendet laufende Räume.
Inaktive Räume werden nach ROOM_TTL_SECONDS aufgeräumt (lazy, bei jedem Request).
Muster wie `impostor_online.py`.

Die Spiellogik läuft hier autoritativ auf dem Server (Port der Regeln aus
`frontend/src/lib/codewort/engine.ts`): nur so bleibt der Schlüssel geheim —
Ermittler bekommen die Zugehörigkeit unaufgedeckter Karten nie ausgeliefert.

Identität ohne Login: Beim Erstellen/Beitreten bekommt jeder Spieler ein
zufälliges Token, das der Client im Header `X-Player-Token` mitschickt.

Phasen: lobby → clue ⇄ guessing → ended → (Revanche) clue / lobby

Endpoints:
- POST   /codewort/rooms                        — Raum erstellen (Ersteller = Host)
- POST   /codewort/rooms/{code}/join            — Beitreten (nur Lobby)
- GET    /codewort/rooms/{code}                 — Personalisierter Zustand (Polling)
- PATCH  /codewort/rooms/{code}/settings        — Host: Wortpaket (nur Lobby)
- POST   /codewort/rooms/{code}/team            — Team + Chef/Ermittler wählen (nur Lobby)
- DELETE /codewort/rooms/{code}/players/{id}    — Host kickt / Spieler verlässt (nur Lobby)
- POST   /codewort/rooms/{code}/start           — Host: Partie starten (Lobby oder Ende)
- POST   /codewort/rooms/{code}/clue            — Chef des aktiven Teams: Hinweis
- POST   /codewort/rooms/{code}/reveal          — Ermittler des aktiven Teams: Karte aufdecken
- POST   /codewort/rooms/{code}/end-turn        — Ermittler des aktiven Teams: Zug beenden
- POST   /codewort/rooms/{code}/lobby           — Host: zurück in die Lobby
"""

from dataclasses import dataclass, field
from typing import Literal, Optional
import random
import secrets
import threading
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from rate_limit import limiter
from routers.codewort import BOARD_SIZE, draw_pack_words, list_active_packs

router = APIRouter(prefix="/codewort/rooms", tags=["codewort-online"])

ROOM_TTL_SECONDS = 2 * 60 * 60
MAX_ROOMS = 200
MIN_PLAYERS = 4  # je Team ein Chef + mindestens ein Ermittler
MAX_PLAYERS = 16
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # ohne I/O (Verwechslung mit 1/0)
CODE_LENGTH = 4
RECENT_CAP = 75  # zuletzt gespielte Wörter, die bei der Revanche gemieden werden

# Kartenverteilung 9 / 8 / 7 / 1 (INV-2). Das Startteam hat die 9.
START_TEAM_AGENTS = 9
SECOND_TEAM_AGENTS = 8
NEUTRAL_CARDS = 7

# Online feste Namen passend zu den Kartenfarben (teamA = blau, teamB = gelb).
TEAM_NAMES = {"A": "Team Blau", "B": "Team Gelb"}

TeamLiteral = Literal["A", "B"]


# ---------- In-Memory-State ----------

@dataclass
class Player:
    id: int
    name: str
    token: str
    team: Optional[str] = None
    spymaster: bool = False


@dataclass
class Card:
    word: str
    role: str  # teamA | teamB | neutral | assassin
    revealed: bool = False


@dataclass
class Room:
    code: str
    host_id: int
    pack_id: int
    pack_name: str
    last_activity: float
    players: list[Player] = field(default_factory=list)
    phase: str = "lobby"
    round_number: int = 0
    cards: list[Card] = field(default_factory=list)
    start_team: str = "A"
    current_team: str = "A"
    clue: Optional[dict] = None           # {"word", "count"}
    guesses_made: int = 0
    history: list[dict] = field(default_factory=list)
    current_reveals: list[dict] = field(default_factory=list)
    winner: Optional[str] = None
    win_reason: Optional[str] = None
    last_reveal: Optional[dict] = None
    recent_words: list[str] = field(default_factory=list)
    next_player_id: int = 1


_rooms: dict[str, Room] = {}
# Sync-Endpoints laufen im Threadpool → alle Zugriffe auf _rooms serialisieren.
_lock = threading.Lock()


def _now() -> float:
    return time.monotonic()


# ---------- Pydantic Schemas ----------

class NameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class JoinResponse(BaseModel):
    code: str
    player_id: int
    token: str


class SettingsUpdate(BaseModel):
    pack_id: int


class TeamRequest(BaseModel):
    team: TeamLiteral
    spymaster: bool = False


class ClueRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=40)
    count: int = Field(..., ge=0, le=9)  # 0 = unbegrenzt (INV-5)

    @field_validator("word")
    @classmethod
    def one_word(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Hinweiswort darf nicht leer sein")
        if any(ch.isspace() for ch in v):
            raise ValueError("Ein Hinweis besteht aus genau einem Wort")
        return v


class RevealRequest(BaseModel):
    index: int = Field(..., ge=0, lt=BOARD_SIZE)


class PlayerView(BaseModel):
    id: int
    name: str
    team: Optional[TeamLiteral]
    spymaster: bool


class ClueView(BaseModel):
    word: str
    count: int


class CardView(BaseModel):
    word: str
    role: Optional[str]  # None = Zugehörigkeit für diesen Spieler verborgen
    revealed: bool


class RevealEntryView(BaseModel):
    index: int
    word: str
    role: str


class TurnEntryView(BaseModel):
    team: TeamLiteral
    clue: ClueView
    reveals: list[RevealEntryView]
    endReason: str


class LastRevealView(BaseModel):
    team: TeamLiteral            # Team, das aufgedeckt hat
    word: str
    role: str
    end_reason: Optional[str]    # None = Team darf weiter raten


class GameView(BaseModel):
    cards: list[CardView]
    start_team: TeamLiteral
    current_team: TeamLiteral
    clue: Optional[ClueView]
    guesses_made: int
    guesses_remaining: Optional[int]  # None = unbegrenzt
    remaining: dict[str, int]         # {"A": .., "B": ..}
    history: list[TurnEntryView]
    winner: Optional[TeamLiteral]
    win_reason: Optional[str]
    last_reveal: Optional[LastRevealView]


class RoomView(BaseModel):
    code: str
    phase: str
    round_number: int
    me: int
    host_id: int
    players: list[PlayerView]
    pack_id: int
    pack_name: str
    team_names: dict[str, str]
    min_players: int
    max_players: int
    game: Optional[GameView] = None


# ---------- Helpers: Raum ----------

def _sweep_expired() -> None:
    cutoff = _now() - ROOM_TTL_SECONDS
    for code in [c for c, r in _rooms.items() if r.last_activity < cutoff]:
        del _rooms[code]


def _new_code() -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        if code not in _rooms:
            return code


def _add_player(room: Room, name: str) -> Player:
    if len(room.players) >= MAX_PLAYERS:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Raum ist voll (max. {MAX_PLAYERS})")
    if any(p.name.lower() == name.lower() for p in room.players):
        raise HTTPException(status.HTTP_409_CONFLICT, "Name ist in diesem Raum schon vergeben")
    player = Player(id=room.next_player_id, name=name, token=secrets.token_urlsafe(24))
    room.next_player_id += 1
    room.players.append(player)
    return player


def _get_room(code: str) -> Room:
    _sweep_expired()
    room = _rooms.get(code.upper())
    if not room:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Raum nicht gefunden")
    room.last_activity = _now()
    return room


def _get_player(room: Room, token: Optional[str]) -> Player:
    # Bewusst 403 statt 401: der Frontend-api()-Helper leitet bei 401 auf /login.
    if token:
        for p in room.players:
            if secrets.compare_digest(p.token, token):
                return p
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Du bist nicht (mehr) in diesem Raum")


def _require_host(room: Room, player: Player) -> None:
    if player.id != room.host_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Nur der Host darf das")


def _require_phase(room: Room, *phases: str) -> None:
    if room.phase not in phases:
        raise HTTPException(status.HTTP_409_CONFLICT, "Aktion in dieser Spielphase nicht möglich")


def _require_active(room: Room, player: Player, spymaster: bool) -> None:
    """Nur der Chef (bzw. ein Ermittler) des Teams am Zug darf handeln."""
    if player.team != room.current_team or player.spymaster != spymaster:
        who = "Chef" if spymaster else "Ermittler"
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Nur der {who} von {TEAM_NAMES[room.current_team]} ist gerade dran",
        )


def _playable_pack(db: Session, pack_id: Optional[int] = None):
    """Erstes (bzw. gewähltes) aktives Paket mit genug Wörtern für eine Auslage."""
    for p in list_active_packs(db):
        if p.word_count >= BOARD_SIZE and (pack_id is None or p.id == pack_id):
            return p
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Kein spielbares Wortpaket gefunden")


def _check_teams(room: Room) -> None:
    if any(p.team is None for p in room.players):
        raise HTTPException(status.HTTP_409_CONFLICT, "Alle Spieler müssen einem Team beitreten")
    for team, name in TEAM_NAMES.items():
        members = [p for p in room.players if p.team == team]
        if sum(p.spymaster for p in members) != 1:
            raise HTTPException(status.HTTP_409_CONFLICT, f"{name} braucht genau einen Chef")
        if not any(not p.spymaster for p in members):
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"{name} braucht mindestens einen Ermittler"
            )


# ---------- Helpers: Spiellogik (Port von lib/codewort/engine.ts) ----------

def _other(team: str) -> str:
    return "B" if team == "A" else "A"


def _role_of(team: str) -> str:
    return "teamA" if team == "A" else "teamB"


def _remaining(room: Room) -> dict[str, int]:
    rem = {"A": 0, "B": 0}
    for c in room.cards:
        if not c.revealed and c.role in ("teamA", "teamB"):
            rem["A" if c.role == "teamA" else "B"] += 1
    return rem


def _guess_limit(room: Room) -> Optional[int]:
    """Erlaubte Tipps: Hinweiszahl + 1, bei 0 unbegrenzt (INV-5)."""
    return None if room.clue["count"] == 0 else room.clue["count"] + 1


def _new_game(room: Room, words: list[str]) -> None:
    start = random.choice(["A", "B"])
    roles = (
        [_role_of(start)] * START_TEAM_AGENTS
        + [_role_of(_other(start))] * SECOND_TEAM_AGENTS
        + ["neutral"] * NEUTRAL_CARDS
        + ["assassin"]
    )
    random.shuffle(roles)
    room.cards = [Card(word=w, role=r) for w, r in zip(words, roles)]
    room.start_team = start
    room.current_team = start
    room.clue = None
    room.guesses_made = 0
    room.history = []
    room.current_reveals = []
    room.winner = None
    room.win_reason = None
    room.last_reveal = None
    room.round_number += 1
    room.phase = "clue"


def _close_turn(room: Room, end_reason: str) -> None:
    room.history.append({
        "team": room.current_team,
        "clue": room.clue,
        "reveals": room.current_reveals,
        "endReason": end_reason,
    })
    room.clue = None
    room.guesses_made = 0
    room.current_reveals = []


def _end_turn(room: Room, end_reason: str) -> None:
    _close_turn(room, end_reason)
    room.current_team = _other(room.current_team)
    room.phase = "clue"


def _end_game(room: Room, winner: str, win_reason: str, end_reason: str) -> None:
    _close_turn(room, end_reason)
    room.winner = winner
    room.win_reason = win_reason
    room.phase = "ended"


def _reveal(room: Room, index: int) -> None:
    """Karte aufdecken und Konsequenz auswerten (INV-6, INV-8, INV-9)."""
    card = room.cards[index]
    if card.revealed:
        raise HTTPException(status.HTTP_409_CONFLICT, "Karte ist schon aufgedeckt")
    card.revealed = True
    team = room.current_team
    room.current_reveals.append({"index": index, "word": card.word, "role": card.role})

    end_reason: Optional[str] = None
    if card.role == "assassin":
        # Attentäter: aktives Team verliert sofort (INV-8).
        end_reason = "assassin"
        _end_game(room, _other(team), "assassin", end_reason)
    elif card.role == "neutral":
        end_reason = "wrong_card"
        _end_turn(room, end_reason)
    else:
        revealed_team = "A" if card.role == "teamA" else "B"
        if _remaining(room)[revealed_team] == 0:
            # Letzter Agent — dieses Team gewinnt, egal wer aufgedeckt hat (INV-9).
            end_reason = "game_end"
            _end_game(room, revealed_team, "all_agents", end_reason)
        elif revealed_team == team:
            room.guesses_made += 1
            limit = _guess_limit(room)
            if limit is not None and room.guesses_made >= limit:
                end_reason = "out_of_guesses"
                _end_turn(room, end_reason)
        else:
            end_reason = "wrong_card"
            _end_turn(room, end_reason)

    room.last_reveal = {"team": team, "word": card.word, "role": card.role, "end_reason": end_reason}


# ---------- View ----------

def _view(room: Room, me: Player) -> RoomView:
    view = RoomView(
        code=room.code,
        phase=room.phase,
        round_number=room.round_number,
        me=me.id,
        host_id=room.host_id,
        players=[
            PlayerView(id=p.id, name=p.name, team=p.team, spymaster=p.spymaster)
            for p in room.players
        ],
        pack_id=room.pack_id,
        pack_name=room.pack_name,
        team_names=TEAM_NAMES,
        min_players=MIN_PLAYERS,
        max_players=MAX_PLAYERS,
    )
    if room.phase == "lobby":
        return view

    # Geheimhaltung (INV-11): Zugehörigkeit unaufgedeckter Karten nur für Chefs
    # bzw. nach Spielende.
    sees_key = me.spymaster or room.phase == "ended"
    guesses_remaining: Optional[int] = 0
    if room.phase == "guessing":
        limit = _guess_limit(room)
        guesses_remaining = None if limit is None else limit - room.guesses_made
    view.game = GameView(
        cards=[
            CardView(word=c.word, role=c.role if c.revealed or sees_key else None, revealed=c.revealed)
            for c in room.cards
        ],
        start_team=room.start_team,
        current_team=room.current_team,
        clue=room.clue,
        guesses_made=room.guesses_made,
        guesses_remaining=guesses_remaining,
        remaining=_remaining(room),
        history=room.history,
        winner=room.winner,
        win_reason=room.win_reason,
        last_reveal=room.last_reveal,
    )
    return view


# ---------- Endpoints ----------

@router.post("", response_model=JoinResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_room(request: Request, payload: NameRequest, db: Session = Depends(get_db)):
    """Erstellt einen Raum; Default-Paket = erstes spielbares aktives Paket."""
    pack = _playable_pack(db)
    with _lock:
        _sweep_expired()
        if len(_rooms) >= MAX_ROOMS:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Gerade sind zu viele Räume offen — bitte später nochmal",
            )
        room = Room(
            code=_new_code(),
            host_id=0,
            pack_id=pack.id,
            pack_name=pack.name,
            last_activity=_now(),
        )
        host = _add_player(room, payload.name)
        room.host_id = host.id
        _rooms[room.code] = room
        return JoinResponse(code=room.code, player_id=host.id, token=host.token)


@router.post("/{code}/join", response_model=JoinResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def join_room(request: Request, code: str, payload: NameRequest):
    with _lock:
        room = _get_room(code)
        if room.phase != "lobby":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Die Partie läuft schon — warte, bis der Host zurück in die Lobby geht",
            )
        player = _add_player(room, payload.name)
        return JoinResponse(code=room.code, player_id=player.id, token=player.token)


@router.get("/{code}", response_model=RoomView)
def get_room(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        return _view(room, _get_player(room, x_player_token))


@router.patch("/{code}/settings", response_model=RoomView)
def update_settings(
    code: str,
    payload: SettingsUpdate,
    x_player_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    pack = _playable_pack(db, payload.pack_id)
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "lobby")
        room.pack_id = pack.id
        room.pack_name = pack.name
        return _view(room, me)


@router.post("/{code}/team", response_model=RoomView)
def choose_team(code: str, payload: TeamRequest, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_phase(room, "lobby")
        if payload.spymaster and any(
            p.team == payload.team and p.spymaster and p.id != me.id for p in room.players
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"{TEAM_NAMES[payload.team]} hat schon einen Chef"
            )
        me.team = payload.team
        me.spymaster = payload.spymaster
        return _view(room, me)


@router.delete("/{code}/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_player(code: str, player_id: int, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        if me.id != player_id:
            _require_host(room, me)
        _require_phase(room, "lobby")
        if player_id == room.host_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Der Host kann den Raum nicht verlassen")
        if not any(p.id == player_id for p in room.players):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Spieler nicht gefunden")
        room.players = [p for p in room.players if p.id != player_id]


@router.post("/{code}/start", response_model=RoomView)
def start_game(
    code: str,
    x_player_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "lobby", "ended")
        _check_teams(room)
        drawn = draw_pack_words(db, room.pack_id, room.recent_words)
        room.recent_words = (drawn.words + room.recent_words)[:RECENT_CAP]
        _new_game(room, drawn.words)
        return _view(room, me)


@router.post("/{code}/clue", response_model=RoomView)
def give_clue(code: str, payload: ClueRequest, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_phase(room, "clue")
        _require_active(room, me, spymaster=True)
        room.clue = {"word": payload.word, "count": payload.count}
        room.guesses_made = 0
        room.current_reveals = []
        room.phase = "guessing"
        return _view(room, me)


@router.post("/{code}/reveal", response_model=RoomView)
def reveal_card(code: str, payload: RevealRequest, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_phase(room, "guessing")
        _require_active(room, me, spymaster=False)
        _reveal(room, payload.index)
        return _view(room, me)


@router.post("/{code}/end-turn", response_model=RoomView)
def end_turn(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_phase(room, "guessing")
        _require_active(room, me, spymaster=False)
        # „Zug beenden" erst ab dem ersten Tipp (INV-10).
        if room.guesses_made < 1:
            raise HTTPException(status.HTTP_409_CONFLICT, "Erst mindestens eine Karte aufdecken")
        _end_turn(room, "voluntary")
        room.last_reveal = None
        return _view(room, me)


@router.post("/{code}/lobby", response_model=RoomView)
def back_to_lobby(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        room.phase = "lobby"
        room.cards = []
        room.clue = None
        room.history = []
        room.current_reveals = []
        room.last_reveal = None
        room.winner = None
        room.win_reason = None
        return _view(room, me)

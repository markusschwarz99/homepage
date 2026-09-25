"""
Impostor-Spiel — Online-Modus (jeder Spieler am eigenen Gerät).

Räume leben NUR im Speicher des Backend-Prozesses (Single-Uvicorn) — kein
DB-State, keine Migration. Ein Restart/Deploy beendet laufende Räume.
Inaktive Räume werden nach ROOM_TTL_SECONDS aufgeräumt (lazy, bei jedem Request).

Identität ohne Login: Beim Erstellen/Beitreten bekommt jeder Spieler ein
zufälliges Token, das der Client im Header `X-Player-Token` mitschickt.

Phasen: lobby → reveal → voting → result → (nächste Runde) reveal / lobby

Endpoints:
- POST   /impostor/rooms                        — Raum erstellen (Ersteller = Host)
- POST   /impostor/rooms/{code}/join            — Beitreten (nur Lobby)
- GET    /impostor/rooms/{code}                 — Personalisierter Zustand (Polling)
- PATCH  /impostor/rooms/{code}/settings        — Host: Kategorien/Optionen (nur Lobby)
- DELETE /impostor/rooms/{code}/players/{id}    — Host kickt / Spieler verlässt (nur Lobby)
- POST   /impostor/rooms/{code}/start           — Host: Runde starten (Lobby oder Ergebnis)
- POST   /impostor/rooms/{code}/voting          — Host: Abstimmung starten
- POST   /impostor/rooms/{code}/vote            — Stimme abgeben/ändern
- POST   /impostor/rooms/{code}/finish          — Host: Abstimmung vorzeitig beenden
- POST   /impostor/rooms/{code}/lobby           — Host: zurück in die Lobby
"""

from dataclasses import dataclass, field
from typing import Optional
import random
import secrets
import threading
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from rate_limit import limiter
from routers.impostor import draw_random_word, list_active_categories

router = APIRouter(prefix="/impostor/rooms", tags=["impostor-online"])

ROOM_TTL_SECONDS = 2 * 60 * 60
MAX_ROOMS = 200
MIN_PLAYERS = 3
MAX_PLAYERS = 10
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # ohne I/O (Verwechslung mit 1/0)
CODE_LENGTH = 4


# ---------- In-Memory-State ----------

@dataclass
class Player:
    id: int
    name: str
    token: str


@dataclass
class Room:
    code: str
    host_id: int
    category_ids: list[int]
    last_activity: float
    players: list[Player] = field(default_factory=list)
    show_category_to_impostor: bool = False
    phase: str = "lobby"
    round_number: int = 0
    word: Optional[str] = None
    category_name: Optional[str] = None
    impostor_id: Optional[int] = None
    starter_id: Optional[int] = None
    votes: dict[int, int] = field(default_factory=dict)  # voter_id → target_id
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
    category_ids: Optional[list[int]] = Field(None, min_length=1, max_length=50)
    show_category_to_impostor: Optional[bool] = None


class VoteRequest(BaseModel):
    target_id: int


class PlayerView(BaseModel):
    id: int
    name: str


class SettingsView(BaseModel):
    category_ids: list[int]
    show_category_to_impostor: bool


class RoleView(BaseModel):
    is_impostor: bool
    word: Optional[str]           # None für den Impostor
    category_name: Optional[str]  # für den Impostor nur, wenn Option aktiv


class VoteView(BaseModel):
    voter_id: int
    target_id: int


class ResultView(BaseModel):
    impostor_id: int
    word: str
    category_name: str
    votes: list[VoteView]
    caught: bool  # Impostor hat allein die meisten Stimmen


class RoomView(BaseModel):
    code: str
    phase: str
    round_number: int
    me: int
    host_id: int
    players: list[PlayerView]
    settings: SettingsView
    min_players: int
    max_players: int
    role: Optional[RoleView] = None
    starter_id: Optional[int] = None
    voted_ids: list[int] = []
    my_vote: Optional[int] = None
    result: Optional[ResultView] = None


# ---------- Helpers ----------

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


def _is_caught(room: Room) -> bool:
    tally: dict[int, int] = {}
    for target in room.votes.values():
        tally[target] = tally.get(target, 0) + 1
    if not tally:
        return False
    top = max(tally.values())
    leaders = [pid for pid, n in tally.items() if n == top]
    return leaders == [room.impostor_id]


def _view(room: Room, me: Player) -> RoomView:
    view = RoomView(
        code=room.code,
        phase=room.phase,
        round_number=room.round_number,
        me=me.id,
        host_id=room.host_id,
        players=[PlayerView(id=p.id, name=p.name) for p in room.players],
        settings=SettingsView(
            category_ids=room.category_ids,
            show_category_to_impostor=room.show_category_to_impostor,
        ),
        min_players=MIN_PLAYERS,
        max_players=MAX_PLAYERS,
    )
    if room.phase == "lobby":
        return view

    # Geheimhaltung: Der Impostor bekommt nie das Wort, die anderen nie die
    # Impostor-ID — beides erst in der Ergebnis-Phase.
    is_impostor = me.id == room.impostor_id
    view.role = RoleView(
        is_impostor=is_impostor,
        word=None if is_impostor else room.word,
        category_name=(
            room.category_name
            if not is_impostor or room.show_category_to_impostor
            else None
        ),
    )
    view.starter_id = room.starter_id
    if room.phase in ("voting", "result"):
        view.voted_ids = list(room.votes.keys())
        view.my_vote = room.votes.get(me.id)
    if room.phase == "result":
        view.result = ResultView(
            impostor_id=room.impostor_id,
            word=room.word,
            category_name=room.category_name,
            votes=[VoteView(voter_id=v, target_id=t) for v, t in room.votes.items()],
            caught=_is_caught(room),
        )
    return view


# ---------- Endpoints ----------

@router.post("", response_model=JoinResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_room(request: Request, payload: NameRequest, db: Session = Depends(get_db)):
    """Erstellt einen Raum; Default-Kategorien = alle aktiven mit Wörtern."""
    category_ids = [c.id for c in list_active_categories(db)]
    if not category_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Kategorien verfügbar")
    with _lock:
        _sweep_expired()
        if len(_rooms) >= MAX_ROOMS:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Gerade sind zu viele Räume offen — bitte später nochmal",
            )
        room = Room(code=_new_code(), host_id=0, category_ids=category_ids, last_activity=_now())
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
                "Die Runde läuft schon — warte, bis der Host zurück in die Lobby geht",
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
):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "lobby")
        if payload.category_ids is not None:
            room.category_ids = list(dict.fromkeys(payload.category_ids))
        if payload.show_category_to_impostor is not None:
            room.show_category_to_impostor = payload.show_category_to_impostor
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
def start_round(
    code: str,
    x_player_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "lobby", "result")
        if len(room.players) < MIN_PLAYERS:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Mindestens {MIN_PLAYERS} Spieler nötig",
            )
        drawn = draw_random_word(db, room.category_ids)
        room.word = drawn.word
        room.category_name = drawn.category_name
        room.impostor_id = random.choice(room.players).id
        room.starter_id = random.choice(room.players).id
        room.votes = {}
        room.round_number += 1
        room.phase = "reveal"
        return _view(room, me)


@router.post("/{code}/voting", response_model=RoomView)
def start_voting(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "reveal")
        room.phase = "voting"
        return _view(room, me)


@router.post("/{code}/vote", response_model=RoomView)
def vote(code: str, payload: VoteRequest, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_phase(room, "voting")
        if payload.target_id == me.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Du kannst nicht für dich selbst stimmen")
        if not any(p.id == payload.target_id for p in room.players):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unbekannter Spieler")
        room.votes[me.id] = payload.target_id
        if len(room.votes) == len(room.players):
            room.phase = "result"
        return _view(room, me)


@router.post("/{code}/finish", response_model=RoomView)
def finish_voting(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        _require_phase(room, "voting")
        room.phase = "result"
        return _view(room, me)


@router.post("/{code}/lobby", response_model=RoomView)
def back_to_lobby(code: str, x_player_token: Optional[str] = Header(None)):
    with _lock:
        room = _get_room(code)
        me = _get_player(room, x_player_token)
        _require_host(room, me)
        room.phase = "lobby"
        room.word = None
        room.category_name = None
        room.impostor_id = None
        room.starter_id = None
        room.votes = {}
        return _view(room, me)

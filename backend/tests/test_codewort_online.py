"""Tests für den Codewort-Online-Modus (In-Memory-Räume, serverseitige Spiellogik)."""

import pytest

from routers import codewort_online


# ---------- Fixtures & Helpers ----------

@pytest.fixture(autouse=True)
def clear_rooms():
    codewort_online._rooms.clear()
    yield
    codewort_online._rooms.clear()


def _make_pack(client, admin_headers, name, n):
    pack = client.post("/codewort/admin/packs", json={"name": name}, headers=admin_headers).json()
    client.post(
        f"/codewort/admin/packs/{pack['id']}/words",
        json={"words": [f"{name}{i}" for i in range(n)]},
        headers=admin_headers,
    )
    return pack


@pytest.fixture
def pack(client, admin_headers):
    return _make_pack(client, admin_headers, "Basis", 30)


def _h(player):
    return {"X-Player-Token": player["token"]}


def _create(client, name="Host"):
    res = client.post("/codewort/rooms", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def _join(client, code, name):
    res = client.post(f"/codewort/rooms/{code}/join", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def _state(client, code, player):
    res = client.get(f"/codewort/rooms/{code}", headers=_h(player))
    assert res.status_code == 200, res.text
    return res.json()


def _team(client, code, player, team, spymaster=False):
    return client.post(
        f"/codewort/rooms/{code}/team",
        json={"team": team, "spymaster": spymaster},
        headers=_h(player),
    )


def _full_room(client):
    """4 Spieler: Host = Chef A, Bob = Ermittler A, Carol = Chef B, Dave = Ermittler B."""
    host = _create(client)
    code = host["code"]
    bob, carol, dave = (_join(client, code, n) for n in ("Bob", "Carol", "Dave"))
    assert _team(client, code, host, "A", True).status_code == 200
    assert _team(client, code, bob, "A").status_code == 200
    assert _team(client, code, carol, "B", True).status_code == 200
    assert _team(client, code, dave, "B").status_code == 200
    return code, {"chefA": host, "opA": bob, "chefB": carol, "opB": dave}


def _started(client):
    code, p = _full_room(client)
    res = client.post(f"/codewort/rooms/{code}/start", headers=_h(p["chefA"]))
    assert res.status_code == 200, res.text
    return code, p, codewort_online._rooms[code]


def _chef(p, team):
    return p["chefA"] if team == "A" else p["chefB"]


def _op(p, team):
    return p["opA"] if team == "A" else p["opB"]


def _clue(client, code, p, room, count=1):
    res = client.post(
        f"/codewort/rooms/{code}/clue",
        json={"word": "Hinweis", "count": count},
        headers=_h(_chef(p, room.current_team)),
    )
    assert res.status_code == 200, res.text
    return res.json()


def _reveal(client, code, player, index):
    return client.post(f"/codewort/rooms/{code}/reveal", json={"index": index}, headers=_h(player))


def _indices(room, role):
    return [i for i, c in enumerate(room.cards) if c.role == role and not c.revealed]


# ---------- Raum & Lobby ----------

class TestLobby:
    def test_create_requires_playable_pack(self, client, admin_headers):
        _make_pack(client, admin_headers, "Klein", 10)
        res = client.post("/codewort/rooms", json={"name": "Host"})
        assert res.status_code == 404

    def test_create_and_state(self, client, pack):
        host = _create(client)
        state = _state(client, host["code"], host)
        assert state["phase"] == "lobby"
        assert state["host_id"] == host["player_id"]
        assert state["pack_id"] == pack["id"]
        assert state["game"] is None
        assert state["players"] == [
            {"id": host["player_id"], "name": "Host", "team": None, "spymaster": False}
        ]

    def test_state_requires_valid_token(self, client, pack):
        host = _create(client)
        assert client.get(f"/codewort/rooms/{host['code']}").status_code == 403

    def test_join_duplicate_name_rejected(self, client, pack):
        host = _create(client, name="Alice")
        res = client.post(f"/codewort/rooms/{host['code']}/join", json={"name": "ALICE"})
        assert res.status_code == 409

    def test_only_one_spymaster_per_team(self, client, pack):
        host = _create(client)
        bob = _join(client, host["code"], "Bob")
        assert _team(client, host["code"], host, "A", True).status_code == 200
        assert _team(client, host["code"], bob, "A", True).status_code == 409
        # Chef darf zum Ermittler wechseln, dann ist der Platz frei
        assert _team(client, host["code"], host, "A").status_code == 200
        assert _team(client, host["code"], bob, "A", True).status_code == 200

    def test_settings_pack(self, client, admin_headers, pack):
        other = _make_pack(client, admin_headers, "Zweit", 25)
        small = _make_pack(client, admin_headers, "Klein", 10)
        host = _create(client)
        bob = _join(client, host["code"], "Bob")
        url = f"/codewort/rooms/{host['code']}/settings"
        assert client.patch(url, json={"pack_id": other["id"]}, headers=_h(bob)).status_code == 403
        assert client.patch(url, json={"pack_id": small["id"]}, headers=_h(host)).status_code == 404
        res = client.patch(url, json={"pack_id": other["id"]}, headers=_h(host))
        assert res.status_code == 200
        assert res.json()["pack_name"] == "Zweit"

    def test_kick_and_leave(self, client, pack):
        host = _create(client)
        code = host["code"]
        bob, carol = _join(client, code, "Bob"), _join(client, code, "Carol")
        assert client.delete(f"/codewort/rooms/{code}/players/{carol['player_id']}", headers=_h(bob)).status_code == 403
        assert client.delete(f"/codewort/rooms/{code}/players/{bob['player_id']}", headers=_h(bob)).status_code == 204
        assert client.delete(f"/codewort/rooms/{code}/players/{carol['player_id']}", headers=_h(host)).status_code == 204
        assert client.delete(f"/codewort/rooms/{code}/players/{host['player_id']}", headers=_h(host)).status_code == 400
        assert client.get(f"/codewort/rooms/{code}", headers=_h(carol)).status_code == 403

    def test_expired_room_is_removed(self, client, pack, monkeypatch):
        host = _create(client)
        now = codewort_online._now()
        monkeypatch.setattr(
            codewort_online, "_now", lambda: now + codewort_online.ROOM_TTL_SECONDS + 1
        )
        assert client.get(f"/codewort/rooms/{host['code']}", headers=_h(host)).status_code == 404


# ---------- Start & Geheimhaltung ----------

class TestStart:
    def test_start_requires_complete_teams(self, client, pack):
        host = _create(client)
        code = host["code"]
        bob, carol, dave = (_join(client, code, n) for n in ("Bob", "Carol", "Dave"))
        start = lambda: client.post(f"/codewort/rooms/{code}/start", headers=_h(host))
        assert start().status_code == 409  # niemand im Team
        _team(client, code, host, "A", True)
        _team(client, code, bob, "A")
        _team(client, code, carol, "B", True)
        assert start().status_code == 409  # Dave ohne Team
        _team(client, code, dave, "A")
        assert start().status_code == 409  # Team B ohne Ermittler
        _team(client, code, dave, "B")
        assert client.post(f"/codewort/rooms/{code}/start", headers=_h(bob)).status_code == 403
        assert start().status_code == 200

    def test_board_distribution(self, client, pack):
        code, p, room = _started(client)
        state = _state(client, code, p["chefA"])
        game = state["game"]
        assert state["phase"] == "clue"
        assert len(game["cards"]) == 25
        assert len({c["word"] for c in game["cards"]}) == 25
        roles = [c["role"] for c in game["cards"]]
        start = game["start_team"]
        start_role = "teamA" if start == "A" else "teamB"
        other_role = "teamB" if start == "A" else "teamA"
        assert roles.count(start_role) == 9
        assert roles.count(other_role) == 8
        assert roles.count("neutral") == 7
        assert roles.count("assassin") == 1
        assert game["current_team"] == start
        assert game["remaining"] == {"A": 9 if start == "A" else 8, "B": 9 if start == "B" else 8}

    def test_key_hidden_from_operatives(self, client, pack):
        code, p, _ = _started(client)
        for key in ("opA", "opB"):
            game = _state(client, code, p[key])["game"]
            assert all(c["role"] is None for c in game["cards"])
        for key in ("chefA", "chefB"):
            game = _state(client, code, p[key])["game"]
            assert all(c["role"] is not None for c in game["cards"])

    def test_join_blocked_during_game(self, client, pack):
        code, _, _ = _started(client)
        res = client.post(f"/codewort/rooms/{code}/join", json={"name": "Spät"})
        assert res.status_code == 409


# ---------- Züge ----------

class TestTurns:
    def test_only_active_spymaster_gives_clue(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        other = "B" if team == "A" else "A"
        url = f"/codewort/rooms/{code}/clue"
        payload = {"word": "Wort", "count": 1}
        assert client.post(url, json=payload, headers=_h(_chef(p, other))).status_code == 403
        assert client.post(url, json=payload, headers=_h(_op(p, team))).status_code == 403
        bad = client.post(url, json={"word": "zwei Wörter", "count": 1}, headers=_h(_chef(p, team)))
        assert bad.status_code == 422
        # Ermittler dürfen vor dem Hinweis nicht raten
        assert _reveal(client, code, _op(p, team), 0).status_code == 409
        state = client.post(url, json=payload, headers=_h(_chef(p, team))).json()
        assert state["phase"] == "guessing"
        assert state["game"]["clue"] == {"word": "Wort", "count": 1}
        assert state["game"]["guesses_remaining"] == 2

    def test_only_active_operatives_reveal(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        other = "B" if team == "A" else "A"
        _clue(client, code, p, room)
        assert _reveal(client, code, _op(p, other), 0).status_code == 403
        assert _reveal(client, code, _chef(p, team), 0).status_code == 403

    def test_own_agent_continues_until_limit(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        own = _indices(room, "teamA" if team == "A" else "teamB")
        _clue(client, code, p, room, count=1)  # 2 Versuche
        state = _reveal(client, code, _op(p, team), own[0]).json()
        assert state["phase"] == "guessing"
        assert state["game"]["guesses_remaining"] == 1
        assert state["game"]["last_reveal"]["end_reason"] is None
        assert _reveal(client, code, _op(p, team), own[0]).status_code == 409  # schon offen
        state = _reveal(client, code, _op(p, team), own[1]).json()
        assert state["phase"] == "clue"
        assert state["game"]["current_team"] != team
        assert state["game"]["last_reveal"]["end_reason"] == "out_of_guesses"
        assert state["game"]["history"][-1]["endReason"] == "out_of_guesses"
        assert len(state["game"]["history"][-1]["reveals"]) == 2

    def test_count_zero_is_unlimited(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        own = _indices(room, "teamA" if team == "A" else "teamB")
        _clue(client, code, p, room, count=0)
        for i in own[:4]:
            state = _reveal(client, code, _op(p, team), i).json()
        assert state["phase"] == "guessing"
        assert state["game"]["guesses_remaining"] is None

    def test_neutral_ends_turn(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        _clue(client, code, p, room)
        idx = _indices(room, "neutral")[0]
        state = _reveal(client, code, _op(p, team), idx).json()
        assert state["phase"] == "clue"
        assert state["game"]["current_team"] != team
        assert state["game"]["last_reveal"] == {
            "team": team,
            "word": room.cards[idx].word,
            "role": "neutral",
            "end_reason": "wrong_card",
        }

    def test_opponent_card_ends_turn_and_counts(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        other = "B" if team == "A" else "A"
        before = _state(client, code, p["opA"])["game"]["remaining"][other]
        _clue(client, code, p, room)
        opp = _indices(room, "teamA" if other == "A" else "teamB")[0]
        state = _reveal(client, code, _op(p, team), opp).json()
        assert state["game"]["current_team"] == other
        assert state["game"]["remaining"][other] == before - 1
        # Aufgedeckte Karte ist nun auch für Ermittler sichtbar
        assert state["game"]["cards"][opp]["role"] is not None

    def test_assassin_loses(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        _clue(client, code, p, room)
        state = _reveal(client, code, _op(p, team), _indices(room, "assassin")[0]).json()
        assert state["phase"] == "ended"
        assert state["game"]["winner"] != team
        assert state["game"]["win_reason"] == "assassin"
        # Nach Spielende sehen alle den kompletten Schlüssel
        assert all(c["role"] is not None for c in state["game"]["cards"])

    def test_last_agent_wins(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        own = _indices(room, "teamA" if team == "A" else "teamB")
        _clue(client, code, p, room, count=0)
        for i in own:
            state = _reveal(client, code, _op(p, team), i).json()
        assert state["phase"] == "ended"
        assert state["game"]["winner"] == team
        assert state["game"]["win_reason"] == "all_agents"

    def test_end_turn_voluntary(self, client, pack):
        code, p, room = _started(client)
        team = room.current_team
        _clue(client, code, p, room, count=3)
        url = f"/codewort/rooms/{code}/end-turn"
        assert client.post(url, headers=_h(_op(p, team))).status_code == 409  # noch kein Tipp
        _reveal(client, code, _op(p, team), _indices(room, "teamA" if team == "A" else "teamB")[0])
        state = client.post(url, headers=_h(_op(p, team))).json()
        assert state["phase"] == "clue"
        assert state["game"]["current_team"] != team
        assert state["game"]["history"][-1]["endReason"] == "voluntary"
        assert state["game"]["history"][-1]["team"] == team

    def test_rematch_avoids_recent_words_and_lobby_resets(self, client, pack):
        code, p, room = _started(client)
        first = {c.word for c in room.cards}
        _clue(client, code, p, room)
        _reveal(client, code, _op(p, room.current_team), _indices(room, "assassin")[0])
        state = client.post(f"/codewort/rooms/{code}/start", headers=_h(p["chefA"])).json()
        assert state["round_number"] == 2
        second = {c["word"] for c in state["game"]["cards"]}
        # 30 Wörter im Paket → nur 5 frische; der Rest wird aufgefüllt
        assert len(second - first) == 5

        state = client.post(f"/codewort/rooms/{code}/lobby", headers=_h(p["chefA"])).json()
        assert state["phase"] == "lobby"
        assert state["game"] is None
        # Teams bleiben erhalten
        assert next(pl for pl in state["players"] if pl["name"] == "Carol")["spymaster"] is True

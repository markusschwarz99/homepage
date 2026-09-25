"""Tests für den Impostor-Online-Modus (In-Memory-Räume)."""

import pytest

from routers import impostor_online


# ---------- Fixtures & Helpers ----------

@pytest.fixture(autouse=True)
def clear_rooms():
    impostor_online._rooms.clear()
    yield
    impostor_online._rooms.clear()


@pytest.fixture
def words(client, admin_headers):
    res = client.post(
        "/impostor/admin/categories", json={"name": "Tiere"}, headers=admin_headers
    )
    cat = res.json()
    client.post(
        f"/impostor/admin/categories/{cat['id']}/words",
        json={"words": ["Hund", "Katze"]},
        headers=admin_headers,
    )
    return cat


def _h(player):
    return {"X-Player-Token": player["token"]}


def _create(client, name="Host"):
    res = client.post("/impostor/rooms", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def _join(client, code, name):
    res = client.post(f"/impostor/rooms/{code}/join", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def _room_with_players(client, n=3):
    host = _create(client)
    others = [_join(client, host["code"], f"Spieler{i}") for i in range(1, n)]
    return host, others


def _state(client, code, player):
    res = client.get(f"/impostor/rooms/{code}", headers=_h(player))
    assert res.status_code == 200, res.text
    return res.json()


# ---------- Raum & Lobby ----------

class TestLobby:
    def test_create_requires_categories(self, client):
        res = client.post("/impostor/rooms", json={"name": "Host"})
        assert res.status_code == 404

    def test_create_and_state(self, client, words):
        host = _create(client)
        assert len(host["code"]) == 4
        state = _state(client, host["code"], host)
        assert state["phase"] == "lobby"
        assert state["host_id"] == host["player_id"]
        assert state["me"] == host["player_id"]
        assert state["settings"]["category_ids"] == [words["id"]]
        assert state["role"] is None

    def test_code_is_case_insensitive(self, client, words):
        host = _create(client)
        _join(client, host["code"].lower(), "Bob")

    def test_join_duplicate_name_rejected(self, client, words):
        host = _create(client, name="Alice")
        res = client.post(f"/impostor/rooms/{host['code']}/join", json={"name": " alice "})
        assert res.status_code == 409

    def test_join_empty_name_rejected(self, client, words):
        host = _create(client)
        res = client.post(f"/impostor/rooms/{host['code']}/join", json={"name": "   "})
        assert res.status_code == 422

    def test_join_unknown_room(self, client):
        res = client.post("/impostor/rooms/ZZZZ/join", json={"name": "Bob"})
        assert res.status_code == 404

    def test_room_full(self, client, words):
        host, _ = _room_with_players(client, n=impostor_online.MAX_PLAYERS)
        res = client.post(f"/impostor/rooms/{host['code']}/join", json={"name": "Zuviel"})
        assert res.status_code == 409

    def test_state_requires_valid_token(self, client, words):
        host = _create(client)
        assert client.get(f"/impostor/rooms/{host['code']}").status_code == 403
        res = client.get(
            f"/impostor/rooms/{host['code']}", headers={"X-Player-Token": "falsch"}
        )
        assert res.status_code == 403

    def test_settings_host_only(self, client, words):
        host, (bob, _) = _room_with_players(client)
        payload = {"show_category_to_impostor": True}
        res = client.patch(f"/impostor/rooms/{host['code']}/settings", json=payload, headers=_h(bob))
        assert res.status_code == 403
        res = client.patch(f"/impostor/rooms/{host['code']}/settings", json=payload, headers=_h(host))
        assert res.status_code == 200
        assert res.json()["settings"]["show_category_to_impostor"] is True

    def test_settings_rejects_empty_categories(self, client, words):
        host = _create(client)
        res = client.patch(
            f"/impostor/rooms/{host['code']}/settings",
            json={"category_ids": []},
            headers=_h(host),
        )
        assert res.status_code == 422

    def test_kick_and_leave(self, client, words):
        host, (bob, carol) = _room_with_players(client)
        code = host["code"]
        # Bob darf Carol nicht kicken
        assert client.delete(f"/impostor/rooms/{code}/players/{carol['player_id']}", headers=_h(bob)).status_code == 403
        # Bob verlässt selbst
        assert client.delete(f"/impostor/rooms/{code}/players/{bob['player_id']}", headers=_h(bob)).status_code == 204
        # Host kickt Carol
        assert client.delete(f"/impostor/rooms/{code}/players/{carol['player_id']}", headers=_h(host)).status_code == 204
        # Host kann nicht gehen
        assert client.delete(f"/impostor/rooms/{code}/players/{host['player_id']}", headers=_h(host)).status_code == 400
        assert [p["name"] for p in _state(client, code, host)["players"]] == ["Host"]
        # Gekickter Spieler hat keinen Zugriff mehr
        assert client.get(f"/impostor/rooms/{code}", headers=_h(carol)).status_code == 403

    def test_expired_room_is_removed(self, client, words, monkeypatch):
        host = _create(client)
        now = impostor_online._now()
        monkeypatch.setattr(
            impostor_online, "_now", lambda: now + impostor_online.ROOM_TTL_SECONDS + 1
        )
        assert client.get(f"/impostor/rooms/{host['code']}", headers=_h(host)).status_code == 404
        assert impostor_online._rooms == {}


# ---------- Runde ----------

class TestRound:
    def test_start_needs_min_players(self, client, words):
        host = _create(client)
        _join(client, host["code"], "Bob")
        res = client.post(f"/impostor/rooms/{host['code']}/start", headers=_h(host))
        assert res.status_code == 409

    def test_start_host_only(self, client, words):
        host, (bob, _) = _room_with_players(client)
        res = client.post(f"/impostor/rooms/{host['code']}/start", headers=_h(bob))
        assert res.status_code == 403

    def test_start_with_invalid_categories(self, client, words):
        host, _ = _room_with_players(client)
        client.patch(
            f"/impostor/rooms/{host['code']}/settings",
            json={"category_ids": [9999]},
            headers=_h(host),
        )
        res = client.post(f"/impostor/rooms/{host['code']}/start", headers=_h(host))
        assert res.status_code == 404

    def test_roles_are_secret(self, client, words):
        host, others = _room_with_players(client, n=4)
        players = [host, *others]
        code = host["code"]
        assert client.post(f"/impostor/rooms/{code}/start", headers=_h(host)).status_code == 200

        states = [_state(client, code, p) for p in players]
        impostors = [s for s in states if s["role"]["is_impostor"]]
        crew = [s for s in states if not s["role"]["is_impostor"]]
        assert len(impostors) == 1
        assert impostors[0]["role"]["word"] is None
        assert impostors[0]["role"]["category_name"] is None  # Option standardmäßig aus
        assert {s["role"]["word"] for s in crew} <= {"Hund", "Katze"}
        assert len({s["role"]["word"] for s in crew}) == 1
        for s in states:
            assert s["phase"] == "reveal"
            assert s["result"] is None
            assert "impostor_id" not in s
            assert s["starter_id"] in {p["player_id"] for p in players}

    def test_impostor_sees_category_when_enabled(self, client, words):
        host, others = _room_with_players(client)
        code = host["code"]
        client.patch(
            f"/impostor/rooms/{code}/settings",
            json={"show_category_to_impostor": True},
            headers=_h(host),
        )
        client.post(f"/impostor/rooms/{code}/start", headers=_h(host))
        for p in [host, *others]:
            role = _state(client, code, p)["role"]
            assert role["category_name"] == "Tiere"

    def test_join_blocked_during_round(self, client, words):
        host, _ = _room_with_players(client)
        client.post(f"/impostor/rooms/{host['code']}/start", headers=_h(host))
        res = client.post(f"/impostor/rooms/{host['code']}/join", json={"name": "Spät"})
        assert res.status_code == 409


# ---------- Abstimmung & Ergebnis ----------

def _start_voting(client, n=3):
    host, others = _room_with_players(client, n=n)
    code = host["code"]
    client.post(f"/impostor/rooms/{code}/start", headers=_h(host))
    assert client.post(f"/impostor/rooms/{code}/voting", headers=_h(host)).status_code == 200
    impostor_id = impostor_online._rooms[code].impostor_id
    return code, [host, *others], impostor_id


def _vote(client, code, voter, target):
    return client.post(
        f"/impostor/rooms/{code}/vote", json={"target_id": target["player_id"]}, headers=_h(voter)
    )


def _split(players, impostor_id):
    impostor = next(p for p in players if p["player_id"] == impostor_id)
    crew = [p for p in players if p["player_id"] != impostor_id]
    return impostor, crew


class TestVoting:
    def test_vote_not_before_voting_phase(self, client, words):
        host, (bob, _) = _room_with_players(client)
        code = host["code"]
        client.post(f"/impostor/rooms/{code}/start", headers=_h(host))
        res = _vote(client, code, bob, host)
        assert res.status_code == 409

    def test_cannot_vote_self_or_unknown(self, client, words):
        code, players, _ = _start_voting(client)
        me = players[1]
        assert _vote(client, code, me, me).status_code == 400
        res = client.post(f"/impostor/rooms/{code}/vote", json={"target_id": 999}, headers=_h(me))
        assert res.status_code == 400

    def test_all_votes_eliminate_without_revealing_impostor(self, client, words):
        code, players, impostor_id = _start_voting(client)
        impostor, crew = _split(players, impostor_id)

        # Stimme darf geändert werden, solange abgestimmt wird
        _vote(client, code, crew[0], crew[1])
        state = _vote(client, code, crew[0], impostor).json()
        assert state["my_vote"] == impostor_id
        assert state["phase"] == "voting"
        assert state["voted_ids"] == [crew[0]["player_id"]]

        _vote(client, code, crew[1], impostor)
        state = _vote(client, code, impostor, crew[0]).json()
        assert state["phase"] == "eliminated"
        assert state["eliminated_ids"] == [impostor_id]
        elim = state["elimination"]
        assert elim["player_id"] == impostor_id
        assert elim["tie"] is False
        assert len(elim["votes"]) == 3

        # Geheimhaltung: bis zum Auflösen kein Ergebnis — für niemanden
        for p in crew:
            s = _state(client, code, p)
            assert s["result"] is None
            assert s["role"]["is_impostor"] is False

    def test_resolve_host_only_and_shows_result(self, client, words):
        code, players, impostor_id = _start_voting(client)
        impostor, crew = _split(players, impostor_id)
        for p in crew:
            _vote(client, code, p, impostor)
        _vote(client, code, impostor, crew[0])

        host = players[0]
        not_host = players[1]
        assert client.post(f"/impostor/rooms/{code}/resolve", headers=_h(not_host)).status_code == 403
        state = client.post(f"/impostor/rooms/{code}/resolve", headers=_h(host)).json()
        assert state["phase"] == "result"
        result = state["result"]
        assert result["impostor_id"] == impostor_id
        assert result["word"] in {"Hund", "Katze"}
        assert result["category_name"] == "Tiere"
        assert result["caught"] is True

    def test_resolve_not_during_voting(self, client, words):
        code, players, _ = _start_voting(client)
        assert client.post(f"/impostor/rooms/{code}/resolve", headers=_h(players[0])).status_code == 409

    def test_tie_eliminates_exactly_one_of_the_leaders(self, client, words):
        code, players, impostor_id = _start_voting(client)
        impostor, crew = _split(players, impostor_id)
        # 1:1:1 — Gleichstand, einer fliegt per Los
        _vote(client, code, crew[0], impostor)
        _vote(client, code, crew[1], crew[0])
        state = _vote(client, code, impostor, crew[1]).json()
        assert state["phase"] == "eliminated"
        assert state["elimination"]["tie"] is True
        assert len(state["eliminated_ids"]) == 1
        assert state["eliminated_ids"][0] in {p["player_id"] for p in players}

    def test_multiple_vote_rounds(self, client, words):
        code, players, impostor_id = _start_voting(client, n=4)
        host = players[0]
        impostor, crew = _split(players, impostor_id)
        victim = crew[0]

        # Runde 1: Crew-Mitglied fliegt (3:1)
        for p in players:
            _vote(client, code, p, impostor if p is victim else victim)
        state = _state(client, code, host)
        assert state["eliminated_ids"] == [victim["player_id"]]

        # Runde 2: Stimmen zurückgesetzt, Ausgeschiedene sind außen vor
        state = client.post(f"/impostor/rooms/{code}/voting", headers=_h(host)).json()
        assert state["phase"] == "voting"
        assert state["voted_ids"] == []
        assert state["my_vote"] is None
        assert _vote(client, code, victim, impostor).status_code == 403
        assert _vote(client, code, crew[1], victim).status_code == 400

        # Alle 3 Aktiven stimmen → Auswertung ohne den Ausgeschiedenen
        remaining = [p for p in players if p is not victim]
        for p in remaining:
            _vote(client, code, p, crew[1] if p is impostor else impostor)
        state = _state(client, code, host)
        assert state["phase"] == "eliminated"
        assert state["eliminated_ids"] == [victim["player_id"], impostor_id]

        # Nur noch 2 aktiv → keine weitere Abstimmung, nur Auflösen
        assert client.post(f"/impostor/rooms/{code}/voting", headers=_h(host)).status_code == 409
        state = client.post(f"/impostor/rooms/{code}/resolve", headers=_h(host)).json()
        assert state["result"]["caught"] is True

    def test_not_caught_if_impostor_survives(self, client, words):
        code, players, impostor_id = _start_voting(client)
        impostor, crew = _split(players, impostor_id)
        _vote(client, code, crew[0], crew[1])
        _vote(client, code, impostor, crew[1])
        _vote(client, code, crew[1], impostor)
        state = client.post(f"/impostor/rooms/{code}/resolve", headers=_h(players[0])).json()
        assert state["result"]["caught"] is False

    def test_host_finishes_early(self, client, words):
        code, players, _ = _start_voting(client)
        host = players[0]
        assert client.post(f"/impostor/rooms/{code}/finish", headers=_h(players[1])).status_code == 403
        # Ohne Stimmen lässt sich nicht auswerten
        assert client.post(f"/impostor/rooms/{code}/finish", headers=_h(host)).status_code == 409
        _vote(client, code, players[1], players[2])
        state = client.post(f"/impostor/rooms/{code}/finish", headers=_h(host)).json()
        assert state["phase"] == "eliminated"
        assert state["eliminated_ids"] == [players[2]["player_id"]]
        assert state["result"] is None

    def test_next_round_and_back_to_lobby(self, client, words):
        code, players, _ = _start_voting(client)
        host = players[0]
        _vote(client, code, players[1], players[2])
        client.post(f"/impostor/rooms/{code}/finish", headers=_h(host))
        client.post(f"/impostor/rooms/{code}/resolve", headers=_h(host))

        state = client.post(f"/impostor/rooms/{code}/start", headers=_h(host)).json()
        assert state["phase"] == "reveal"
        assert state["round_number"] == 2
        assert state["voted_ids"] == []
        assert state["eliminated_ids"] == []

        state = client.post(f"/impostor/rooms/{code}/lobby", headers=_h(host)).json()
        assert state["phase"] == "lobby"
        assert state["role"] is None
        assert impostor_online._rooms[code].impostor_id is None
        _join(client, code, "Neu")

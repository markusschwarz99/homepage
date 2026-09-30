import json
from datetime import date, timedelta

import pytest

import models
from auth import hash_password, create_token


@pytest.fixture
def hongar_user(db_session):
    user = models.User(
        name="Hongar Redaktion",
        email="hongar@example.com",
        password=hash_password("HongarPassword123!"),
        role="hongar",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def hongar_headers(hongar_user):
    return {"Authorization": f"Bearer {create_token({'sub': hongar_user.email})}"}


@pytest.fixture
def private_mode(monkeypatch):
    monkeypatch.setenv("HONGAR_PUBLIC", "false")


@pytest.fixture
def public_mode(monkeypatch):
    monkeypatch.setenv("HONGAR_PUBLIC", "true")


def _event(db_session, days=1, title="Bergmesse"):
    event = models.HongarEvent(event_date=date.today() + timedelta(days=days), title=title)
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    return event


class TestConfig:
    def test_default_is_private(self, client, monkeypatch):
        monkeypatch.delenv("HONGAR_PUBLIC", raising=False)
        assert client.get("/hongar/config").json() == {"public": False}

    def test_public_flag(self, client, public_mode):
        assert client.get("/hongar/config").json() == {"public": True}


class TestLoginGate:
    def test_no_token_401(self, client, private_mode):
        assert client.get("/hongar/content").status_code == 401
        assert client.get("/hongar/events").status_code == 401
        assert client.get("/hongar/settings").status_code == 401

    def test_guest_and_member_403(self, client, private_mode, guest_headers, auth_headers):
        assert client.get("/hongar/content", headers=guest_headers).status_code == 403
        assert client.get("/hongar/content", headers=auth_headers).status_code == 403

    def test_hongar_and_admin_allowed(self, client, private_mode, hongar_headers, admin_headers):
        assert client.get("/hongar/content", headers=hongar_headers).status_code == 200
        assert client.get("/hongar/content", headers=admin_headers).status_code == 200

    def test_public_mode_open(self, client, public_mode):
        assert client.get("/hongar/content").status_code == 200
        assert client.get("/hongar/events").status_code == 200
        assert client.get("/hongar/settings").status_code == 200


class TestContent:
    def test_empty_without_content(self, client, public_mode):
        assert client.get("/hongar/content").json() == {"pages": []}

    def test_returns_stored_json(self, client, public_mode, db_session):
        content = {"pages": [{"slug": "start", "title": "Start", "blocks": []}]}
        db_session.add(models.SiteSetting(key="hongar_content", value=json.dumps(content)))
        db_session.commit()
        assert client.get("/hongar/content").json() == content

    def test_not_in_generic_settings_api(self, client, hongar_headers):
        assert client.get("/settings/hongar_content").status_code == 404
        # auch nicht über die Redaktions-Settings änderbar
        client.patch("/hongar/settings", headers=hongar_headers, json={"content": "x"})
        assert client.get("/hongar/content", headers=hongar_headers).json() == {"pages": []}


class TestEvents:
    def test_public_list_only_upcoming_sorted(self, client, public_mode, db_session):
        _event(db_session, days=-1, title="Vorbei")
        _event(db_session, days=10, title="Später")
        _event(db_session, days=0, title="Heute")
        titles = [e["title"] for e in client.get("/hongar/events").json()]
        assert titles == ["Heute", "Später"]

    def test_admin_list_includes_past(self, client, hongar_headers, db_session):
        _event(db_session, days=-1, title="Vorbei")
        _event(db_session, days=1, title="Bald")
        titles = [e["title"] for e in client.get("/hongar/admin/events", headers=hongar_headers).json()]
        assert titles == ["Vorbei", "Bald"]

    def test_create_update_delete(self, client, hongar_headers):
        r = client.post("/hongar/events", headers=hongar_headers, json={
            "event_date": "2030-07-28",
            "time_label": " 10 Uhr ",
            "title": " Bergmesse ",
        })
        assert r.status_code == 200
        event = r.json()
        assert event["title"] == "Bergmesse"
        assert event["time_label"] == "10 Uhr"
        assert event["description"] == ""

        r = client.patch(f"/hongar/events/{event['id']}", headers=hongar_headers, json={
            "description": "Mit Frühschoppen",
            "event_date": "2030-07-29",
        })
        assert r.status_code == 200
        assert r.json()["description"] == "Mit Frühschoppen"
        assert r.json()["event_date"] == "2030-07-29"
        assert r.json()["title"] == "Bergmesse"

        assert client.delete(f"/hongar/events/{event['id']}", headers=hongar_headers).status_code == 200
        assert client.delete(f"/hongar/events/{event['id']}", headers=hongar_headers).status_code == 404

    def test_validation(self, client, hongar_headers):
        assert client.post("/hongar/events", headers=hongar_headers, json={
            "event_date": "kein-datum", "title": "X",
        }).status_code == 422
        assert client.post("/hongar/events", headers=hongar_headers, json={
            "event_date": "2030-01-01", "title": "   ",
        }).status_code == 422

    def test_member_and_guest_cannot_write(self, client, auth_headers, guest_headers, db_session):
        body = {"event_date": "2030-01-01", "title": "X"}
        assert client.post("/hongar/events", headers=auth_headers, json=body).status_code == 403
        assert client.post("/hongar/events", headers=guest_headers, json=body).status_code == 403
        event = _event(db_session)
        assert client.delete(f"/hongar/events/{event.id}", headers=auth_headers).status_code == 403
        assert client.get("/hongar/admin/events", headers=auth_headers).status_code == 403


def _closure(db_session, start=1, end=7, note=""):
    closure = models.HongarClosure(
        start_date=date.today() + timedelta(days=start),
        end_date=date.today() + timedelta(days=end),
        note=note,
    )
    db_session.add(closure)
    db_session.commit()
    db_session.refresh(closure)
    return closure


class TestClosures:
    def test_private_mode_gated(self, client, private_mode):
        assert client.get("/hongar/closures").status_code == 401

    def test_public_list_current_and_upcoming_sorted(self, client, public_mode, db_session):
        _closure(db_session, start=-10, end=-1, note="Vorbei")
        _closure(db_session, start=30, end=40, note="Später")
        _closure(db_session, start=-2, end=0, note="Läuft")
        notes = [c["note"] for c in client.get("/hongar/closures").json()]
        assert notes == ["Läuft", "Später"]

    def test_admin_list_includes_past(self, client, hongar_headers, db_session):
        _closure(db_session, start=-10, end=-1, note="Vorbei")
        _closure(db_session, start=1, end=2, note="Bald")
        r = client.get("/hongar/admin/closures", headers=hongar_headers)
        assert [c["note"] for c in r.json()] == ["Vorbei", "Bald"]

    def test_create_update_delete(self, client, hongar_headers):
        r = client.post("/hongar/closures", headers=hongar_headers, json={
            "start_date": "2030-11-03",
            "end_date": "2030-11-20",
            "note": " Ab 21. November wieder für euch da ",
        })
        assert r.status_code == 200
        closure = r.json()
        assert closure["start_date"] == "2030-11-03"
        assert closure["note"] == "Ab 21. November wieder für euch da"

        r = client.patch(f"/hongar/closures/{closure['id']}", headers=hongar_headers, json={
            "end_date": "2030-11-25",
        })
        assert r.status_code == 200
        assert r.json()["end_date"] == "2030-11-25"
        assert r.json()["start_date"] == "2030-11-03"

        assert client.delete(f"/hongar/closures/{closure['id']}", headers=hongar_headers).status_code == 200
        assert client.delete(f"/hongar/closures/{closure['id']}", headers=hongar_headers).status_code == 404

    def test_single_day_allowed(self, client, hongar_headers):
        r = client.post("/hongar/closures", headers=hongar_headers, json={
            "start_date": "2030-12-24", "end_date": "2030-12-24",
        })
        assert r.status_code == 200

    def test_end_before_start_rejected(self, client, hongar_headers, db_session):
        assert client.post("/hongar/closures", headers=hongar_headers, json={
            "start_date": "2030-11-20", "end_date": "2030-11-03",
        }).status_code == 422
        closure = _closure(db_session, start=10, end=20)
        r = client.patch(f"/hongar/closures/{closure.id}", headers=hongar_headers, json={
            "start_date": (date.today() + timedelta(days=30)).isoformat(),
        })
        assert r.status_code == 400
        db_session.refresh(closure)
        assert closure.start_date == date.today() + timedelta(days=10)

    def test_member_and_guest_cannot_write(self, client, auth_headers, guest_headers, db_session):
        body = {"start_date": "2030-01-01", "end_date": "2030-01-02"}
        assert client.post("/hongar/closures", headers=auth_headers, json=body).status_code == 403
        assert client.post("/hongar/closures", headers=guest_headers, json=body).status_code == 403
        closure = _closure(db_session)
        assert client.patch(f"/hongar/closures/{closure.id}", headers=auth_headers, json={"note": "x"}).status_code == 403
        assert client.delete(f"/hongar/closures/{closure.id}", headers=auth_headers).status_code == 403
        assert client.get("/hongar/admin/closures", headers=auth_headers).status_code == 403


class TestEditorPermissions:
    def test_guest_cannot_write_settings(self, client, guest_headers):
        r = client.patch("/hongar/settings", headers=guest_headers, json={"news": "x"})
        assert r.status_code == 403

    def test_hongar_role_not_member(self, client, hongar_headers):
        # hongar-Redaktion bekommt keinen Zugriff auf Haushalts-/Member-Bereiche
        assert client.post(
            "/improvements",
            headers=hongar_headers,
            json={"title": "t", "category": "idee", "description": "d"},
        ).status_code == 403


class TestSettings:
    def test_update_and_read(self, client, public_mode, hongar_headers):
        r = client.patch("/hongar/settings", headers=hongar_headers, json={
            "news": "<p>Offen</p><script>x</script>",
            "facebook_url": "https://www.facebook.com/beispiel",
        })
        assert r.status_code == 200
        data = client.get("/hongar/settings").json()
        assert data["news"] == "<p>Offen</p>"
        assert data["facebook_url"] == "https://www.facebook.com/beispiel"
        assert data["opening_hours"] == ""

    def test_non_https_url_rejected(self, client, hongar_headers):
        r = client.patch("/hongar/settings", headers=hongar_headers, json={"booking_url": "javascript:alert(1)"})
        assert r.status_code == 400

    def test_settings_not_in_generic_settings_api(self, client):
        assert client.get("/settings/hongar_news").status_code == 404

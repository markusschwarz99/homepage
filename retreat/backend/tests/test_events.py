from conftest import headers

from models import Event

NEW = {
    "start": "2026-10-20T19:00",
    "end": "2026-10-20T21:00",
    "title": "Grillen",
    "category": "meal",
    "place": "hotel",
}


def test_state_contains_events_with_ids(client, db):
    events = client.get("/api/state", headers=headers(db, "ben-beispiel")).json()["content"]["events"]
    assert len(events) == 7
    assert all(isinstance(e["id"], int) for e in events)
    assert events == sorted(events, key=lambda e: e["start"])


def test_create_event(client, db):
    res = client.post("/api/events", json=NEW, headers=headers(db, "anna-muster"))
    assert res.status_code == 201
    assert res.json()["title"] == "Grillen"
    assert db.query(Event).count() == 8


def test_events_require_orga(client, db):
    h = headers(db, "ben-beispiel")
    event_id = db.query(Event).first().id
    assert client.post("/api/events", json=NEW, headers=h).status_code == 403
    assert client.patch(f"/api/events/{event_id}", json={"title": "x"}, headers=h).status_code == 403
    assert client.delete(f"/api/events/{event_id}", headers=h).status_code == 403
    assert client.post("/api/events", json=NEW).status_code == 401


def test_create_event_validation(client, db):
    h = headers(db, "anna-muster")
    bad_place = {**NEW, "place": "nirgendwo"}
    assert client.post("/api/events", json=bad_place, headers=h).status_code == 422
    bad_time = {**NEW, "end": "2026-10-20T18:00"}
    assert client.post("/api/events", json=bad_time, headers=h).status_code == 422
    bad_format = {**NEW, "start": "20.10.2026 19:00"}
    assert client.post("/api/events", json=bad_format, headers=h).status_code == 422


def test_update_event(client, db):
    event = db.query(Event).filter(Event.title == "Kick-off").one()
    h = headers(db, "anna-muster")
    res = client.patch(f"/api/events/{event.id}",
                       json={"title": "Kick-off & Welcome", "end": "2026-10-18T17:30", "place": None},
                       headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Kick-off & Welcome"
    assert data["end"] == "2026-10-18T17:30"
    assert data["place"] is None
    assert data["start"] == "2026-10-18T15:00"  # unverändert


def test_update_event_validation(client, db):
    event = db.query(Event).filter(Event.title == "Kick-off").one()
    h = headers(db, "anna-muster")
    res = client.patch(f"/api/events/{event.id}", json={"end": "2026-10-18T14:00"}, headers=h)
    assert res.status_code == 422
    assert "end muss nach start" in res.json()["detail"]
    assert client.patch(f"/api/events/{event.id}", json={"place": "x"}, headers=h).status_code == 422
    assert client.patch("/api/events/9999", json={}, headers=h).status_code == 404


def test_delete_event(client, db):
    event_id = db.query(Event).first().id
    h = headers(db, "anna-muster")
    assert client.delete(f"/api/events/{event_id}", headers=h).status_code == 204
    assert client.delete(f"/api/events/{event_id}", headers=h).status_code == 404
    assert db.query(Event).count() == 6

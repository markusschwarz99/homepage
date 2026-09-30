from conftest import headers, person

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
    assert len(events) == 8
    assert all(isinstance(e["id"], int) for e in events)
    assert events == sorted(events, key=lambda e: e["start"])


def test_create_event(client, db):
    res = client.post("/api/events", json=NEW, headers=headers(db, "anna-muster"))
    assert res.status_code == 201
    assert res.json()["title"] == "Grillen"
    assert db.query(Event).count() == 9


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
    assert db.query(Event).count() == 7


# --- Aktivitäten = Termine mit category="activity" ---

ACTIVITY = {
    "start": "2026-10-21T15:00",
    "end": "2026-10-21T17:00",
    "title": "Padel",
    "category": "activity",
    "maps_url": "https://maps.app.goo.gl/abc",
}


def test_state_event_activity_fields(client, db):
    events = client.get("/api/state", headers=headers(db, "ben-beispiel")).json()["content"]["events"]
    kajak = next(e for e in events if e["title"] == "Kajak")
    assert kajak["coordinator_id"] == person(db, "daniel-demo").id
    assert sorted(kajak["participant_ids"]) == sorted(
        [person(db, "ben-beispiel").id, person(db, "clara-test").id]
    )
    assert kajak["url"] == "https://example.com/kajak"
    strand = next(e for e in events if e["title"] == "Strand")
    assert len(strand["participant_ids"]) == 8


def test_create_activity_event_with_people(client, db):
    ids = [person(db, "eva-probe").id, person(db, "felix-fake").id]
    body = {**ACTIVITY, "coordinator_id": person(db, "anna-muster").id, "participant_ids": ids}
    res = client.post("/api/events", json=body, headers=headers(db, "anna-muster"))
    assert res.status_code == 201
    assert sorted(res.json()["participant_ids"]) == sorted(ids)
    assert res.json()["maps_url"] == ACTIVITY["maps_url"]


def test_event_links_must_be_http(client, db):
    h = headers(db, "anna-muster")
    for field in ("maps_url", "url"):
        res = client.post("/api/events", json={**ACTIVITY, field: "javascript:alert(1)"}, headers=h)
        assert res.status_code == 422
        assert "http" in res.json()["detail"]
    event_id = db.query(Event).first().id
    res = client.patch(f"/api/events/{event_id}", json={"url": "javascript:alert(1)"}, headers=h)
    assert res.status_code == 422


def test_event_unknown_people_rejected(client, db):
    h = headers(db, "anna-muster")
    assert client.post("/api/events", json={**ACTIVITY, "participant_ids": [999]}, headers=h).status_code == 422
    assert client.post("/api/events", json={**ACTIVITY, "coordinator_id": 999}, headers=h).status_code == 422


def test_update_event_participants_partial(client, db):
    kajak = db.query(Event).filter(Event.title == "Kajak").one()
    hans = person(db, "hans-hinz").id
    res = client.patch(f"/api/events/{kajak.id}", json={"participant_ids": [hans], "coordinator_id": None},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 200
    data = res.json()
    assert data["participant_ids"] == [hans]
    assert data["coordinator_id"] is None
    assert data["url"] == "https://example.com/kajak"  # unverändert
    assert data["start"] == "2026-10-20T15:00"


def test_validation_detail_is_string(client, db):
    res = client.post("/api/events", json={"title": "x"}, headers=headers(db, "anna-muster"))
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)

from conftest import headers, person

from models import Activity

NEW = {"day": "2026-10-21", "title": "Padel", "maps_url": "https://maps.google.com/?q=padel"}


def _state(client, db, key="ben-beispiel"):
    return client.get("/api/state", headers=headers(db, key)).json()


def test_state_contains_activities(client, db):
    acts = _state(client, db)["activities"]
    assert [a["title"] for a in acts] == ["Strand", "Kajak"]
    assert len(acts[0]["participant_ids"]) == 8  # "alle"
    kajak = acts[1]
    assert kajak["coordinator_id"] == person(db, "daniel-demo").id
    assert sorted(kajak["participant_ids"]) == sorted(
        [person(db, "ben-beispiel").id, person(db, "clara-test").id]
    )


def test_create_activity_with_people(client, db):
    ids = [person(db, "eva-probe").id, person(db, "felix-fake").id]
    body = {**NEW, "coordinator_id": person(db, "anna-muster").id, "participant_ids": ids}
    res = client.post("/api/activities", json=body, headers=headers(db, "anna-muster"))
    assert res.status_code == 201
    assert sorted(res.json()["participant_ids"]) == sorted(ids)
    assert db.query(Activity).count() == 3


def test_activities_require_orga(client, db):
    h = headers(db, "ben-beispiel")
    act_id = db.query(Activity).first().id
    assert client.post("/api/activities", json=NEW, headers=h).status_code == 403
    assert client.patch(f"/api/activities/{act_id}", json={"title": "x"}, headers=h).status_code == 403
    assert client.delete(f"/api/activities/{act_id}", headers=h).status_code == 403


def test_links_must_be_http(client, db):
    h = headers(db, "anna-muster")
    for field in ("maps_url", "url"):
        res = client.post("/api/activities", json={**NEW, field: "javascript:alert(1)"}, headers=h)
        assert res.status_code == 422
        assert "http" in res.json()["detail"]
    act_id = db.query(Activity).first().id
    res = client.patch(f"/api/activities/{act_id}", json={"url": "javascript:alert(1)"}, headers=h)
    assert res.status_code == 422


def test_unknown_people_rejected(client, db):
    h = headers(db, "anna-muster")
    assert client.post("/api/activities", json={**NEW, "participant_ids": [999]}, headers=h).status_code == 422
    assert client.post("/api/activities", json={**NEW, "coordinator_id": 999}, headers=h).status_code == 422


def test_update_activity_partial(client, db):
    kajak = db.query(Activity).filter(Activity.title == "Kajak").one()
    h = headers(db, "anna-muster")
    hans = person(db, "hans-hinz").id
    res = client.patch(f"/api/activities/{kajak.id}", json={"participant_ids": [hans], "coordinator_id": None},
                       headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["participant_ids"] == [hans]
    assert data["coordinator_id"] is None
    assert data["url"] == "https://example.com/kajak"  # unverändert
    assert client.patch("/api/activities/999", json={}, headers=h).status_code == 404


def test_delete_activity(client, db):
    act_id = db.query(Activity).first().id
    h = headers(db, "anna-muster")
    assert client.delete(f"/api/activities/{act_id}", headers=h).status_code == 204
    assert client.delete(f"/api/activities/{act_id}", headers=h).status_code == 404
    assert db.query(Activity).count() == 1


def test_validation_detail_is_string(client, db):
    res = client.post("/api/activities", json={"title": "x"}, headers=headers(db, "anna-muster"))
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)

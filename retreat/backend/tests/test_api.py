from conftest import apartment, car, headers, person


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_state_requires_token(client):
    assert client.get("/api/state").status_code == 401
    bad = {"Authorization": "Bearer falsch"}
    assert client.get("/api/state", headers=bad).status_code == 401


def test_state_returns_me_without_tokens(client, db):
    res = client.get("/api/state", headers=headers(db, "ben-beispiel"))
    assert res.status_code == 200
    data = res.json()
    assert data["me"]["first_name"] == "Ben"
    assert len(data["people"]) == 8
    assert "token" not in res.text
    assert data["content"]["info"]["title"] == "Teamretreat 2026"


def test_state_without_content_is_503(client, db):
    from models import Content

    db.delete(db.get(Content, 1))
    db.commit()
    assert client.get("/api/state", headers=headers(db, "ben-beispiel")).status_code == 503


def test_patch_requires_orga(client, db):
    ben = person(db, "ben-beispiel")
    res = client.patch(f"/api/people/{ben.id}", json={"apartment_id": None},
                       headers=headers(db, "ben-beispiel"))
    assert res.status_code == 403


def test_move_to_other_car_becomes_passenger(client, db):
    anna = person(db, "anna-muster")  # Fahrerin Auto 1
    res = client.patch(f"/api/people/{anna.id}", json={"car_id": car(db, "auto-2").id},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 200
    assert res.json()["car_role"] == "passenger"


def test_second_driver_conflict(client, db):
    ben = person(db, "ben-beispiel")
    res = client.patch(f"/api/people/{ben.id}", json={"car_role": "driver"},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 409
    assert "Fahrer:in" in res.json()["detail"]


def test_second_co_driver_conflict(client, db):
    felix = person(db, "felix-fake")
    res = client.patch(f"/api/people/{felix.id}", json={"car_role": "co_driver"},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 409


def test_role_swap_within_car(client, db):
    ben = person(db, "ben-beispiel")
    res = client.patch(f"/api/people/{ben.id}", json={"car_role": "co_driver"},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 200
    assert res.json()["car_role"] == "co_driver"


def test_car_full(client, db):
    auto1 = car(db, "auto-1")
    auto1.seats = 3
    db.commit()
    hans = person(db, "hans-hinz")
    res = client.patch(f"/api/people/{hans.id}", json={"car_id": auto1.id},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 409
    assert "voll" in res.json()["detail"]


def test_taxi_only_passengers(client, db):
    hans = person(db, "hans-hinz")
    taxi = car(db, "taxi")
    bad = client.patch(f"/api/people/{hans.id}",
                       json={"car_id": taxi.id, "car_role": "driver"},
                       headers=headers(db, "anna-muster"))
    assert bad.status_code == 409
    ok = client.patch(f"/api/people/{hans.id}", json={"car_id": taxi.id},
                      headers=headers(db, "anna-muster"))
    assert ok.status_code == 200
    assert ok.json()["car_role"] == "passenger"


def test_unassign_car_clears_role(client, db):
    anna = person(db, "anna-muster")
    res = client.patch(f"/api/people/{anna.id}", json={"car_id": None},
                       headers=headers(db, "anna-muster"))
    assert res.json()["car_id"] is None
    assert res.json()["car_role"] is None


def test_apartment_full(client, db):
    hans = person(db, "hans-hinz")
    res = client.patch(f"/api/people/{hans.id}",
                       json={"apartment_id": apartment(db, "101").id},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 409
    assert "voll" in res.json()["detail"]


def test_apartment_move(client, db):
    hans = person(db, "hans-hinz")
    apt = apartment(db, "102")
    res = client.patch(f"/api/people/{hans.id}", json={"apartment_id": apt.id},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 409  # 102 ist voll (2/2)
    gina = person(db, "gina-gast")
    res = client.patch(f"/api/people/{gina.id}", json={"apartment_id": None},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 200
    studio = apartment(db, "studio")
    res = client.patch(f"/api/people/{hans.id}", json={"apartment_id": studio.id},
                       headers=headers(db, "anna-muster"))
    assert res.status_code == 200
    assert res.json()["apartment_id"] == studio.id


def test_patch_unknown_ids(client, db):
    h = headers(db, "anna-muster")
    assert client.patch("/api/people/9999", json={}, headers=h).status_code == 404
    hans = person(db, "hans-hinz")
    assert client.patch(f"/api/people/{hans.id}", json={"car_id": 9999},
                        headers=h).status_code == 404
    assert client.patch(f"/api/people/{hans.id}", json={"car_role": "pilot"},
                        headers=h).status_code == 422

import pytest


@pytest.fixture
def sample_payload():
    """Apfel: Aug-Okt regional + storage, Nov-Apr nur storage."""
    return {
        "name": "Apfel",
        "category": "fruit",
        "availabilities": [
            {"month": 1, "types": ["storage"]},
            {"month": 2, "types": ["storage"]},
            {"month": 3, "types": ["storage"]},
            {"month": 4, "types": ["storage"]},
            {"month": 8, "types": ["regional"]},
            {"month": 9, "types": ["regional", "storage"]},
            {"month": 10, "types": ["regional", "storage"]},
            {"month": 11, "types": ["storage"]},
            {"month": 12, "types": ["storage"]},
        ],
        "notes": "Lange lagerfähig",
    }


@pytest.fixture
def created_item(client, admin_headers, sample_payload):
    response = client.post("/seasonal", json=sample_payload, headers=admin_headers)
    assert response.status_code == 201, response.text
    return response.json()


def _months_of(item: dict) -> list[int]:
    """Hilfs-Extraktor für 'in welchen Monaten ist dieses Item irgendwie verfügbar'."""
    return sorted(entry["month"] for entry in item["availabilities"])


def _types_for_month(item: dict, month: int) -> list[str]:
    for entry in item["availabilities"]:
        if entry["month"] == month:
            return entry["types"]
    return []


# ---------- Auth ----------

class TestAuth:
    def test_list_unauthenticated(self, client):
        response = client.get("/seasonal")
        assert response.status_code == 401

    def test_list_guest_forbidden(self, client, guest_headers):
        response = client.get("/seasonal", headers=guest_headers)
        assert response.status_code == 403

    def test_list_member(self, client, auth_headers):
        response = client.get("/seasonal", headers=auth_headers)
        assert response.status_code == 200

    def test_list_household(self, client, household_headers):
        response = client.get("/seasonal", headers=household_headers)
        assert response.status_code == 200

    def test_list_admin(self, client, admin_headers):
        response = client.get("/seasonal", headers=admin_headers)
        assert response.status_code == 200

    def test_create_member_forbidden(self, client, auth_headers, sample_payload):
        response = client.post("/seasonal", json=sample_payload, headers=auth_headers)
        assert response.status_code == 403

    def test_create_household_forbidden(self, client, household_headers, sample_payload):
        response = client.post("/seasonal", json=sample_payload, headers=household_headers)
        assert response.status_code == 403

    def test_create_unauthenticated(self, client, sample_payload):
        response = client.post("/seasonal", json=sample_payload)
        assert response.status_code == 401

    def test_update_member_forbidden(self, client, auth_headers, created_item):
        response = client.patch(
            f"/seasonal/{created_item['id']}",
            json={"name": "X"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_delete_member_forbidden(self, client, auth_headers, created_item):
        response = client.delete(f"/seasonal/{created_item['id']}", headers=auth_headers)
        assert response.status_code == 403


# ---------- CRUD ----------

class TestCRUD:
    def test_create(self, client, admin_headers, sample_payload):
        response = client.post("/seasonal", json=sample_payload, headers=admin_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Apfel"
        assert data["category"] == "fruit"
        assert _months_of(data) == [1, 2, 3, 4, 8, 9, 10, 11, 12]
        # Multi-Type pro Monat
        assert _types_for_month(data, 9) == ["regional", "storage"]
        assert _types_for_month(data, 1) == ["storage"]
        assert "id" in data

    def test_create_with_import_type(self, client, admin_headers):
        """Regression: 'import' als Wert (Python-Enum-Member heißt 'import_', Value 'import')."""
        response = client.post(
            "/seasonal",
            json={
                "name": "Banane", "category": "fruit",
                "availabilities": [
                    {"month": 1, "types": ["import"]},
                    {"month": 6, "types": ["regional", "import"]},
                ],
            },
            headers=admin_headers,
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert _types_for_month(data, 1) == ["import"]
        assert _types_for_month(data, 6) == ["regional", "import"]

    def test_create_duplicate_name(self, client, admin_headers, created_item, sample_payload):
        response = client.post("/seasonal", json=sample_payload, headers=admin_headers)
        assert response.status_code == 409

    def test_create_duplicate_case_insensitive(self, client, admin_headers, created_item):
        response = client.post(
            "/seasonal",
            json={
                "name": "APFEL",
                "category": "fruit",
                "availabilities": [{"month": 1, "types": ["regional"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 409

    def test_get_item(self, client, auth_headers, created_item):
        response = client.get(f"/seasonal/{created_item['id']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == created_item["id"]

    def test_get_not_found(self, client, auth_headers):
        response = client.get("/seasonal/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_partial(self, client, admin_headers, created_item):
        """PATCH ohne availabilities: Notizen ändern, Verfügbarkeiten bleiben unverändert."""
        original_avail = created_item["availabilities"]
        response = client.patch(
            f"/seasonal/{created_item['id']}",
            json={"notes": "Aktualisiert"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Aktualisiert"
        assert data["availabilities"] == original_avail
        assert data["name"] == "Apfel"

    def test_update_replaces_availabilities(self, client, admin_headers, created_item):
        """PATCH mit availabilities: kompletter Replace."""
        response = client.patch(
            f"/seasonal/{created_item['id']}",
            json={
                "availabilities": [
                    {"month": 10, "types": ["regional"]},
                    {"month": 11, "types": ["storage"]},
                ]
            },
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert _months_of(data) == [10, 11]
        assert _types_for_month(data, 10) == ["regional"]
        assert _types_for_month(data, 11) == ["storage"]

    def test_update_change_multi_type(self, client, admin_headers, created_item):
        """Bestehenden Monat von single auf multi-type ändern."""
        response = client.patch(
            f"/seasonal/{created_item['id']}",
            json={
                "availabilities": [
                    {"month": 5, "types": ["regional", "import"]},
                ]
            },
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert _types_for_month(data, 5) == ["regional", "import"]

    def test_update_not_found(self, client, admin_headers):
        response = client.patch("/seasonal/99999", json={"notes": "x"}, headers=admin_headers)
        assert response.status_code == 404

    def test_delete(self, client, admin_headers, created_item):
        response = client.delete(f"/seasonal/{created_item['id']}", headers=admin_headers)
        assert response.status_code == 204
        response = client.get(f"/seasonal/{created_item['id']}", headers=admin_headers)
        assert response.status_code == 404

    def test_delete_cascades_availabilities(self, client, admin_headers, created_item, db_session):
        """Beim Löschen eines Items werden zugehörige availabilities mitgelöscht (FK CASCADE)."""
        import models as _models
        item_id = created_item["id"]
        before = db_session.query(_models.SeasonalAvailabilityEntry).filter_by(item_id=item_id).count()
        assert before > 0

        response = client.delete(f"/seasonal/{item_id}", headers=admin_headers)
        assert response.status_code == 204

        after = db_session.query(_models.SeasonalAvailabilityEntry).filter_by(item_id=item_id).count()
        assert after == 0

    def test_delete_not_found(self, client, admin_headers):
        response = client.delete("/seasonal/99999", headers=admin_headers)
        assert response.status_code == 404


# ---------- Validation ----------

class TestValidation:
    def test_invalid_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "fruit",
                "availabilities": [{"month": 13, "types": ["regional"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_zero_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "fruit",
                "availabilities": [{"month": 0, "types": ["regional"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_empty_availabilities(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "fruit", "availabilities": []},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_empty_types_per_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "fruit",
                "availabilities": [{"month": 1, "types": []}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_duplicate_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "fruit",
                "availabilities": [
                    {"month": 5, "types": ["regional"]},
                    {"month": 5, "types": ["storage"]},
                ],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_invalid_category(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "meat",
                "availabilities": [{"month": 1, "types": ["regional"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_invalid_type(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "T", "category": "fruit",
                "availabilities": [{"month": 1, "types": ["fresh"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_empty_name(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={
                "name": "", "category": "fruit",
                "availabilities": [{"month": 1, "types": ["regional"]}],
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_types_deduped(self, client, admin_headers):
        """Doppelte types pro Monat werden serverseitig dedupliziert."""
        response = client.post(
            "/seasonal",
            json={
                "name": "Erdbeere", "category": "fruit",
                "availabilities": [
                    {"month": 5, "types": ["regional", "regional", "storage"]},
                ],
            },
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert _types_for_month(data, 5) == ["regional", "storage"]


# ---------- Filter ----------

class TestFilter:
    @pytest.fixture
    def items_set(self, client, admin_headers):
        items = [
            {
                "name": "Apfel", "category": "fruit",
                "availabilities": [
                    {"month": 9, "types": ["regional"]},
                    {"month": 10, "types": ["regional", "storage"]},
                    {"month": 11, "types": ["storage"]},
                ],
            },
            {
                "name": "Erdbeere", "category": "fruit",
                "availabilities": [
                    {"month": 6, "types": ["regional"]},
                    {"month": 7, "types": ["regional"]},
                ],
            },
            {
                "name": "Karotte", "category": "vegetable",
                "availabilities": [
                    {"month": 6, "types": ["regional"]},
                    {"month": 7, "types": ["regional"]},
                    {"month": 8, "types": ["regional"]},
                    {"month": 9, "types": ["regional"]},
                ],
            },
            {
                "name": "Kürbis", "category": "vegetable",
                "availabilities": [
                    {"month": 9, "types": ["regional"]},
                    {"month": 10, "types": ["regional", "storage"]},
                    {"month": 11, "types": ["storage"]},
                ],
            },
        ]
        for it in items:
            r = client.post("/seasonal", json=it, headers=admin_headers)
            assert r.status_code == 201

    def test_filter_category(self, client, auth_headers, items_set):
        response = client.get("/seasonal?category=fruit", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(item["category"] == "fruit" for item in data)

    def test_filter_month(self, client, auth_headers, items_set):
        response = client.get("/seasonal?month=9", headers=auth_headers)
        assert response.status_code == 200
        names = {item["name"] for item in response.json()}
        assert names == {"Apfel", "Karotte", "Kürbis"}

    def test_filter_invalid_month(self, client, auth_headers):
        response = client.get("/seasonal?month=13", headers=auth_headers)
        assert response.status_code == 422

    def test_filter_combined(self, client, auth_headers, items_set):
        response = client.get(
            "/seasonal?category=vegetable&month=10", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Kürbis"

    def test_filter_type_regional(self, client, auth_headers, items_set):
        """Filter auf type=regional: alle Items mit mindestens einem regional-Eintrag."""
        response = client.get("/seasonal?type=regional", headers=auth_headers)
        assert response.status_code == 200
        names = {item["name"] for item in response.json()}
        assert names == {"Apfel", "Erdbeere", "Karotte", "Kürbis"}

    def test_filter_type_storage(self, client, auth_headers, items_set):
        response = client.get("/seasonal?type=storage", headers=auth_headers)
        assert response.status_code == 200
        names = {item["name"] for item in response.json()}
        assert names == {"Apfel", "Kürbis"}

    def test_filter_month_and_type(self, client, auth_headers, items_set):
        """November + storage → Apfel und Kürbis."""
        response = client.get("/seasonal?month=11&type=storage", headers=auth_headers)
        assert response.status_code == 200
        names = {item["name"] for item in response.json()}
        assert names == {"Apfel", "Kürbis"}

    def test_filter_month_and_type_no_match(self, client, auth_headers, items_set):
        """November + regional → nichts (im Items-Set hat kein Item Nov-regional)."""
        response = client.get("/seasonal?month=11&type=regional", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_current(self, client, auth_headers, items_set):
        response = client.get("/seasonal/current", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

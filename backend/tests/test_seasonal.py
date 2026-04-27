import pytest


@pytest.fixture
def sample_payload():
    return {
        "name": "Apfel",
        "category": "fruit",
        "months": [9, 10, 11, 12, 1, 2, 3],
        "availability": "storage",
        "notes": "Lange lagerfähig",
    }


@pytest.fixture
def created_item(client, admin_headers, sample_payload):
    response = client.post("/seasonal", json=sample_payload, headers=admin_headers)
    assert response.status_code == 201, response.text
    return response.json()


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
        response = client.put(
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
        assert data["availability"] == "storage"
        assert data["months"] == [1, 2, 3, 9, 10, 11, 12]
        assert "id" in data

    def test_create_duplicate_name(self, client, admin_headers, created_item, sample_payload):
        response = client.post("/seasonal", json=sample_payload, headers=admin_headers)
        assert response.status_code == 409

    def test_create_duplicate_case_insensitive(self, client, admin_headers, created_item):
        response = client.post(
            "/seasonal",
            json={"name": "APFEL", "category": "fruit", "months": [1], "availability": "regional"},
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

    def test_update(self, client, admin_headers, created_item):
        response = client.put(
            f"/seasonal/{created_item['id']}",
            json={"notes": "Aktualisiert", "months": [10, 11]},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Aktualisiert"
        assert data["months"] == [10, 11]
        assert data["name"] == "Apfel"

    def test_update_not_found(self, client, admin_headers):
        response = client.put("/seasonal/99999", json={"notes": "x"}, headers=admin_headers)
        assert response.status_code == 404

    def test_delete(self, client, admin_headers, created_item):
        response = client.delete(f"/seasonal/{created_item['id']}", headers=admin_headers)
        assert response.status_code == 204
        response = client.get(f"/seasonal/{created_item['id']}", headers=admin_headers)
        assert response.status_code == 404

    def test_delete_not_found(self, client, admin_headers):
        response = client.delete("/seasonal/99999", headers=admin_headers)
        assert response.status_code == 404


# ---------- Validation ----------

class TestValidation:
    def test_invalid_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "fruit", "months": [13], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_zero_month(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "fruit", "months": [0, 1], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_empty_months(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "fruit", "months": [], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_invalid_category(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "meat", "months": [1], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_invalid_availability(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "T", "category": "fruit", "months": [1], "availability": "fresh"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_empty_name(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "", "category": "fruit", "months": [1], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_months_deduped_sorted(self, client, admin_headers):
        response = client.post(
            "/seasonal",
            json={"name": "Erdbeere", "category": "fruit", "months": [6, 5, 6, 7, 5], "availability": "regional"},
            headers=admin_headers,
        )
        assert response.status_code == 201
        assert response.json()["months"] == [5, 6, 7]


# ---------- Filter ----------

class TestFilter:
    @pytest.fixture
    def items_set(self, client, admin_headers):
        items = [
            {"name": "Apfel", "category": "fruit", "months": [9, 10, 11], "availability": "regional"},
            {"name": "Erdbeere", "category": "fruit", "months": [6, 7], "availability": "regional"},
            {"name": "Karotte", "category": "vegetable", "months": [6, 7, 8, 9], "availability": "regional"},
            {"name": "Kürbis", "category": "vegetable", "months": [9, 10, 11], "availability": "storage"},
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
        response = client.get("/seasonal?category=vegetable&month=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Kürbis"

    def test_current(self, client, auth_headers, items_set):
        response = client.get("/seasonal/current", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

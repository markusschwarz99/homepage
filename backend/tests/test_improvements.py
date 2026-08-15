import models


class TestCreateImprovement:
    def test_member_creates(self, client, auth_headers, db_session):
        response = client.post(
            "/improvements",
            headers=auth_headers,
            json={"title": "Dark Mode", "category": "idee", "description": "Bitte Dark Mode ergänzen"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Dark Mode"
        assert data["category"] == "idee"
        assert data["status"] == "offen"
        assert data["submitter_name"] == "Test User"
        assert db_session.query(models.Improvement).filter_by(title="Dark Mode").first() is not None

    def test_household_creates(self, client, household_headers):
        response = client.post(
            "/improvements",
            headers=household_headers,
            json={"title": "Bug", "category": "bug", "description": "Etwas klemmt"},
        )
        assert response.status_code == 200

    def test_fields_stripped(self, client, auth_headers):
        response = client.post(
            "/improvements",
            headers=auth_headers,
            json={"title": "  Titel  ", "category": "sonstiges", "description": "  Text  "},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Titel"
        assert data["description"] == "Text"

    def test_empty_title_rejected(self, client, auth_headers):
        response = client.post(
            "/improvements",
            headers=auth_headers,
            json={"title": "", "category": "idee", "description": "x"},
        )
        assert response.status_code == 422

    def test_invalid_category_rejected(self, client, auth_headers):
        response = client.post(
            "/improvements",
            headers=auth_headers,
            json={"title": "x", "category": "unfug", "description": "x"},
        )
        assert response.status_code == 422

    def test_guest_forbidden(self, client, guest_headers):
        response = client.post(
            "/improvements",
            headers=guest_headers,
            json={"title": "x", "category": "idee", "description": "x"},
        )
        assert response.status_code == 403

    def test_unauthenticated(self, client):
        response = client.post(
            "/improvements",
            json={"title": "x", "category": "idee", "description": "x"},
        )
        assert response.status_code == 401


class TestListImprovements:
    def test_admin_lists_newest_first(self, client, admin_headers, auth_headers, db_session):
        client.post("/improvements", headers=auth_headers,
                    json={"title": "Erster", "category": "idee", "description": "a"})
        client.post("/improvements", headers=auth_headers,
                    json={"title": "Zweiter", "category": "bug", "description": "b"})

        response = client.get("/improvements", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert [i["title"] for i in data] == ["Zweiter", "Erster"]

    def test_member_cannot_list(self, client, auth_headers):
        response = client.get("/improvements", headers=auth_headers)
        assert response.status_code == 403


class TestUpdateStatus:
    def _create(self, client, auth_headers):
        return client.post("/improvements", headers=auth_headers,
                           json={"title": "x", "category": "idee", "description": "x"}).json()["id"]

    def test_admin_updates_status(self, client, admin_headers, auth_headers, db_session):
        imp_id = self._create(client, auth_headers)
        response = client.patch(f"/improvements/{imp_id}", headers=admin_headers,
                                json={"status": "erledigt"})
        assert response.status_code == 200
        assert response.json()["status"] == "erledigt"

    def test_invalid_status_rejected(self, client, admin_headers, auth_headers):
        imp_id = self._create(client, auth_headers)
        response = client.patch(f"/improvements/{imp_id}", headers=admin_headers,
                                json={"status": "unfug"})
        assert response.status_code == 422

    def test_nonexistent(self, client, admin_headers):
        response = client.patch("/improvements/99999", headers=admin_headers,
                                json={"status": "erledigt"})
        assert response.status_code == 404

    def test_member_cannot_update(self, client, auth_headers):
        imp_id = self._create(client, auth_headers)
        response = client.patch(f"/improvements/{imp_id}", headers=auth_headers,
                                json={"status": "erledigt"})
        assert response.status_code == 403


class TestDeleteImprovement:
    def _create(self, client, auth_headers):
        return client.post("/improvements", headers=auth_headers,
                           json={"title": "x", "category": "idee", "description": "x"}).json()["id"]

    def test_admin_deletes(self, client, admin_headers, auth_headers, db_session):
        imp_id = self._create(client, auth_headers)
        response = client.delete(f"/improvements/{imp_id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.Improvement).filter_by(id=imp_id).first() is None

    def test_nonexistent(self, client, admin_headers):
        response = client.delete("/improvements/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_member_cannot_delete(self, client, auth_headers):
        imp_id = self._create(client, auth_headers)
        response = client.delete(f"/improvements/{imp_id}", headers=auth_headers)
        assert response.status_code == 403

import models


class TestListItems:
    def test_household_lists_empty(self, client, household_headers):
        response = client.get("/shopping/items", headers=household_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_admin_can_list(self, client, admin_headers):
        response = client.get("/shopping/items", headers=admin_headers)
        assert response.status_code == 200

    def test_member_cannot_list(self, client, auth_headers):
        # Shopping ist household-only
        response = client.get("/shopping/items", headers=auth_headers)
        assert response.status_code == 403

    def test_guest_cannot_list(self, client, guest_headers):
        response = client.get("/shopping/items", headers=guest_headers)
        assert response.status_code == 403


class TestAddItem:
    def test_household_adds_item(self, client, household_headers, db_session):
        response = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Milch", "quantity": "2L"},
        )
        assert response.status_code == 200
        items = db_session.query(models.ShoppingItem).all()
        assert len(items) == 1
        assert items[0].name == "Milch"
        assert items[0].quantity == "2L"

    def test_add_item_trims_whitespace(self, client, household_headers, db_session):
        client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "  Brot  ", "quantity": "  "},
        )
        item = db_session.query(models.ShoppingItem).first()
        assert item.name == "Brot"
        assert item.quantity == "1"  # Default wenn leer

    def test_member_cannot_add(self, client, auth_headers):
        response = client.post(
            "/shopping/items",
            headers=auth_headers,
            json={"name": "Milch"},
        )
        assert response.status_code == 403


class TestPurchaseItem:
    def test_mark_purchased_creates_history(self, client, household_headers, db_session, household_user):
        # Erst Item anlegen
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Käse", "quantity": "200g"},
        )
        item_id = r.json()["id"]

        # Dann kaufen
        response = client.post(
            f"/shopping/items/{item_id}/purchase",
            headers=household_headers,
        )
        assert response.status_code == 200

        # Item ist weg, History existiert
        assert db_session.query(models.ShoppingItem).filter_by(id=item_id).first() is None
        history = db_session.query(models.PurchaseHistory).all()
        assert len(history) == 1
        assert history[0].item_name == "Käse"
        assert history[0].purchased is True

    def test_purchase_nonexistent(self, client, household_headers):
        response = client.post(
            "/shopping/items/99999/purchase",
            headers=household_headers,
        )
        assert response.status_code == 404


class TestHistory:
    def test_history_empty(self, client, household_headers):
        response = client.get("/shopping/history", headers=household_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_history_after_purchase(self, client, household_headers, household_user, db_session):
        # Item anlegen + kaufen
        r = client.post("/shopping/items", headers=household_headers,
                        json={"name": "Eier", "quantity": "10"})
        client.post(f"/shopping/items/{r.json()['id']}/purchase", headers=household_headers)

        response = client.get("/shopping/history", headers=household_headers)
        assert response.status_code == 200
        entries = response.json()
        assert len(entries) == 1
        assert entries[0]["item_name"] == "Eier"
        assert entries[0]["user_name"] == household_user.name


class TestFrequent:
    def test_frequent_empty(self, client, household_headers):
        response = client.get("/shopping/frequent", headers=household_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_frequent_excludes_current_items(self, client, household_headers, db_session, household_user):
        # Zwei mal "Milch" kaufen
        for _ in range(2):
            r = client.post("/shopping/items", headers=household_headers,
                            json={"name": "Milch", "quantity": "1L"})
            client.post(f"/shopping/items/{r.json()['id']}/purchase", headers=household_headers)

        # Milch erneut auf Liste setzen
        client.post("/shopping/items", headers=household_headers,
                    json={"name": "Milch", "quantity": "1L"})

        # Milch sollte NICHT in frequent auftauchen, weil gerade auf Liste
        response = client.get("/shopping/frequent", headers=household_headers)
        assert response.status_code == 200
        names = [i["name"].lower() for i in response.json()]
        assert "milch" not in names

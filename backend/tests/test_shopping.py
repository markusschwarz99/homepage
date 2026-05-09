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


class TestDescription:
    def test_add_item_with_description(self, client, household_headers, db_session):
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Milch", "quantity": "2L", "description": "laktosefrei"},
        )
        assert r.status_code == 200
        item = db_session.query(models.ShoppingItem).first()
        assert item.description == "laktosefrei"

        listing = client.get("/shopping/items", headers=household_headers).json()
        assert listing[0]["description"] == "laktosefrei"

    def test_add_item_without_description_stores_none(self, client, household_headers, db_session):
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Brot", "quantity": "1"},
        )
        assert r.status_code == 200
        item = db_session.query(models.ShoppingItem).first()
        assert item.description is None

    def test_add_item_blank_description_stored_as_none(self, client, household_headers, db_session):
        client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Kaese", "quantity": "200g", "description": "   "},
        )
        item = db_session.query(models.ShoppingItem).first()
        assert item.description is None

    def test_purchase_carries_description_to_history(self, client, household_headers, db_session):
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Apfel", "quantity": "1kg", "description": "Boskoop"},
        )
        item_id = r.json()["id"]
        client.post(f"/shopping/items/{item_id}/purchase", headers=household_headers)

        hist = db_session.query(models.PurchaseHistory).first()
        assert hist.description == "Boskoop"

    def test_history_returns_description(self, client, household_headers):
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Eier", "quantity": "10", "description": "bio"},
        )
        client.post(f"/shopping/items/{r.json()['id']}/purchase", headers=household_headers)

        entries = client.get("/shopping/history", headers=household_headers).json()
        assert entries[0]["description"] == "bio"

    def test_frequent_includes_last_description(self, client, household_headers):
        # Zwei mal kaufen, beim zweiten Mal mit anderer Description -> last_description
        # soll der NEUESTE Wert sein (purchased_at desc).
        for desc in ("alt", "neu"):
            r = client.post(
                "/shopping/items",
                headers=household_headers,
                json={"name": "Joghurt", "quantity": "500g", "description": desc},
            )
            client.post(f"/shopping/items/{r.json()['id']}/purchase", headers=household_headers)

        freq = client.get("/shopping/frequent", headers=household_headers).json()
        assert len(freq) == 1
        assert freq[0]["name"] == "Joghurt"
        assert freq[0]["last_description"] == "neu"

    def test_frequent_last_description_none_if_never_set(self, client, household_headers):
        # Item ohne Description kaufen -> last_description ist None
        r = client.post(
            "/shopping/items",
            headers=household_headers,
            json={"name": "Salz", "quantity": "1"},
        )
        client.post(f"/shopping/items/{r.json()['id']}/purchase", headers=household_headers)

        freq = client.get("/shopping/frequent", headers=household_headers).json()
        assert freq[0]["last_description"] is None

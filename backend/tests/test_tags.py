import models


class TestListAll:
    def test_member_lists_empty(self, client, auth_headers):
        response = client.get("/tags", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_member_lists_categories_with_tags(self, client, auth_headers, tag_category, tag):
        response = client.get("/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        cat = data[0]
        assert cat["id"] == tag_category.id
        assert cat["name"] == "Kategorie"
        assert cat["position"] == 0
        assert len(cat["tags"]) == 1
        assert cat["tags"][0]["name"] == "Vegetarisch"
        assert cat["tags"][0]["category_id"] == tag_category.id

    def test_categories_ordered_by_position(self, client, auth_headers, db_session):
        c1 = models.TagCategory(name="B", position=1)
        c2 = models.TagCategory(name="A", position=0)
        db_session.add_all([c1, c2])
        db_session.commit()

        response = client.get("/tags", headers=auth_headers)
        data = response.json()
        assert [c["name"] for c in data] == ["A", "B"]

    def test_guest_forbidden(self, client, guest_headers):
        response = client.get("/tags", headers=guest_headers)
        assert response.status_code == 403

    def test_unauthenticated(self, client):
        response = client.get("/tags")
        assert response.status_code == 401


class TestCreateCategory:
    def test_admin_creates_category(self, client, admin_headers, db_session):
        response = client.post(
            "/tags/categories",
            headers=admin_headers,
            json={"name": "Küche"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Küche"
        assert data["position"] == 0
        assert db_session.query(models.TagCategory).filter_by(name="Küche").first() is not None

    def test_position_auto_increments(self, client, admin_headers, tag_category):
        response = client.post(
            "/tags/categories",
            headers=admin_headers,
            json={"name": "Zweite"},
        )
        assert response.status_code == 200
        assert response.json()["position"] == 1

    def test_name_stripped(self, client, admin_headers):
        response = client.post(
            "/tags/categories",
            headers=admin_headers,
            json={"name": "  Trimmed  "},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Trimmed"

    def test_duplicate_name_rejected(self, client, admin_headers, tag_category):
        response = client.post(
            "/tags/categories",
            headers=admin_headers,
            json={"name": tag_category.name},
        )
        assert response.status_code == 400

    def test_empty_name_rejected(self, client, admin_headers):
        response = client.post(
            "/tags/categories",
            headers=admin_headers,
            json={"name": ""},
        )
        assert response.status_code == 422

    def test_member_cannot_create(self, client, auth_headers):
        response = client.post(
            "/tags/categories",
            headers=auth_headers,
            json={"name": "Küche"},
        )
        assert response.status_code == 403


class TestUpdateCategory:
    def test_admin_updates_category(self, client, admin_headers, tag_category, db_session):
        response = client.patch(
            f"/tags/categories/{tag_category.id}",
            headers=admin_headers,
            json={"name": "Umbenannt"},
        )
        assert response.status_code == 200
        db_session.refresh(tag_category)
        assert tag_category.name == "Umbenannt"

    def test_nonexistent_category(self, client, admin_headers):
        response = client.patch(
            "/tags/categories/99999",
            headers=admin_headers,
            json={"name": "x"},
        )
        assert response.status_code == 404

    def test_duplicate_name_rejected(self, client, admin_headers, db_session, tag_category):
        other = models.TagCategory(name="Andere", position=1)
        db_session.add(other)
        db_session.commit()

        response = client.patch(
            f"/tags/categories/{other.id}",
            headers=admin_headers,
            json={"name": tag_category.name},
        )
        assert response.status_code == 400

    def test_member_cannot_update(self, client, auth_headers, tag_category):
        response = client.patch(
            f"/tags/categories/{tag_category.id}",
            headers=auth_headers,
            json={"name": "x"},
        )
        assert response.status_code == 403


class TestDeleteCategory:
    def test_admin_deletes_category(self, client, admin_headers, tag_category, db_session):
        cat_id = tag_category.id
        response = client.delete(f"/tags/categories/{cat_id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.TagCategory).filter_by(id=cat_id).first() is None

    def test_delete_cascades_to_tags(self, client, admin_headers, tag_category, tag, db_session):
        tag_id = tag.id
        response = client.delete(f"/tags/categories/{tag_category.id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.Tag).filter_by(id=tag_id).first() is None

    def test_nonexistent_category(self, client, admin_headers):
        response = client.delete("/tags/categories/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_member_cannot_delete(self, client, auth_headers, tag_category):
        response = client.delete(
            f"/tags/categories/{tag_category.id}",
            headers=auth_headers,
        )
        assert response.status_code == 403


class TestCreateTag:
    def test_admin_creates_tag(self, client, admin_headers, tag_category, db_session):
        response = client.post(
            "/tags/tags",
            headers=admin_headers,
            json={"category_id": tag_category.id, "name": "Vegan"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Vegan"
        assert data["category_id"] == tag_category.id
        assert data["position"] == 0

    def test_position_auto_increments(self, client, admin_headers, tag_category, tag):
        response = client.post(
            "/tags/tags",
            headers=admin_headers,
            json={"category_id": tag_category.id, "name": "Zweiter"},
        )
        assert response.status_code == 200
        assert response.json()["position"] == 1

    def test_nonexistent_category(self, client, admin_headers):
        response = client.post(
            "/tags/tags",
            headers=admin_headers,
            json={"category_id": 99999, "name": "x"},
        )
        assert response.status_code == 404

    def test_duplicate_in_same_category_rejected(self, client, admin_headers, tag_category, tag):
        response = client.post(
            "/tags/tags",
            headers=admin_headers,
            json={"category_id": tag_category.id, "name": tag.name},
        )
        assert response.status_code == 400

    def test_empty_name_rejected(self, client, admin_headers, tag_category):
        response = client.post(
            "/tags/tags",
            headers=admin_headers,
            json={"category_id": tag_category.id, "name": ""},
        )
        assert response.status_code == 422

    def test_member_cannot_create(self, client, auth_headers, tag_category):
        response = client.post(
            "/tags/tags",
            headers=auth_headers,
            json={"category_id": tag_category.id, "name": "x"},
        )
        assert response.status_code == 403


class TestUpdateTag:
    def test_admin_updates_tag(self, client, admin_headers, tag, db_session):
        response = client.patch(
            f"/tags/tags/{tag.id}",
            headers=admin_headers,
            json={"name": "Umbenannt"},
        )
        assert response.status_code == 200
        db_session.refresh(tag)
        assert tag.name == "Umbenannt"

    def test_nonexistent_tag(self, client, admin_headers):
        response = client.patch(
            "/tags/tags/99999",
            headers=admin_headers,
            json={"name": "x"},
        )
        assert response.status_code == 404

    def test_duplicate_name_rejected(self, client, admin_headers, tag_category, tag, db_session):
        other = models.Tag(category_id=tag_category.id, name="Andere", position=1)
        db_session.add(other)
        db_session.commit()

        response = client.patch(
            f"/tags/tags/{other.id}",
            headers=admin_headers,
            json={"name": tag.name},
        )
        assert response.status_code == 400

    def test_member_cannot_update(self, client, auth_headers, tag):
        response = client.patch(
            f"/tags/tags/{tag.id}",
            headers=auth_headers,
            json={"name": "x"},
        )
        assert response.status_code == 403


class TestDeleteTag:
    def test_admin_deletes_tag(self, client, admin_headers, tag, db_session):
        tag_id = tag.id
        response = client.delete(f"/tags/tags/{tag_id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.Tag).filter_by(id=tag_id).first() is None

    def test_nonexistent_tag(self, client, admin_headers):
        response = client.delete("/tags/tags/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_member_cannot_delete(self, client, auth_headers, tag):
        response = client.delete(f"/tags/tags/{tag.id}", headers=auth_headers)
        assert response.status_code == 403

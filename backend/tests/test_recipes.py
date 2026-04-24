import models


class TestListRecipes:
    def test_member_lists_empty(self, client, auth_headers):
        response = client.get("/recipes", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_guest_forbidden(self, client, guest_headers):
        response = client.get("/recipes", headers=guest_headers)
        assert response.status_code == 403

    def test_member_lists_recipe(self, client, auth_headers, recipe):
        response = client.get("/recipes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Rezept"


class TestGetRecipe:
    def test_get_recipe_detail(self, client, auth_headers, recipe):
        response = client.get(f"/recipes/{recipe.id}", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "Test Rezept"
        assert len(body["ingredients"]) == 1
        assert body["ingredients"][0]["name"] == "Mehl"
        assert len(body["steps"]) == 1

    def test_get_nonexistent(self, client, auth_headers):
        response = client.get("/recipes/99999", headers=auth_headers)
        assert response.status_code == 404


class TestCreateRecipe:
    def test_member_creates_recipe(self, client, auth_headers, db_session):
        response = client.post("/recipes", headers=auth_headers, json={
            "title": "Pasta Carbonara",
            "servings": 2,
            "ingredients": [
                {"amount": 200, "unit": "g", "name": "Spaghetti"},
                {"amount": 100, "unit": "g", "name": "Speck"},
            ],
            "steps": [
                {"content": "Wasser kochen"},
                {"content": "Pasta kochen"},
            ],
        })
        assert response.status_code == 200
        recipe_id = response.json()["id"]

        r = db_session.query(models.Recipe).filter_by(id=recipe_id).first()
        assert r.title == "Pasta Carbonara"
        assert len(r.ingredients) == 2
        assert len(r.steps) == 2

    def test_create_with_tags(self, client, auth_headers, tag, db_session):
        response = client.post("/recipes", headers=auth_headers, json={
            "title": "Veggie Dish",
            "servings": 4,
            "tag_ids": [tag.id],
        })
        assert response.status_code == 200
        r = db_session.query(models.Recipe).filter_by(id=response.json()["id"]).first()
        assert len(r.tags) == 1
        assert r.tags[0].id == tag.id

    def test_guest_cannot_create(self, client, guest_headers):
        response = client.post("/recipes", headers=guest_headers, json={
            "title": "x",
            "servings": 1,
        })
        assert response.status_code == 403

    def test_empty_title_rejected(self, client, auth_headers):
        response = client.post("/recipes", headers=auth_headers, json={
            "title": "",
            "servings": 1,
        })
        assert response.status_code == 422


class TestUpdateRecipe:
    def test_owner_updates_own_recipe(self, client, auth_headers, recipe, db_session):
        response = client.patch(f"/recipes/{recipe.id}", headers=auth_headers, json={
            "title": "Updated Titel",
            "servings": 8,
            "ingredients": [{"amount": 500, "unit": "g", "name": "Zucker"}],
            "steps": [{"content": "Mischen"}],
        })
        assert response.status_code == 200
        db_session.refresh(recipe)
        assert recipe.title == "Updated Titel"
        assert recipe.servings == 8

    def test_admin_updates_any_recipe(self, client, admin_headers, recipe, db_session):
        response = client.patch(f"/recipes/{recipe.id}", headers=admin_headers, json={
            "title": "Admin Edit",
            "servings": 2,
        })
        assert response.status_code == 200
        db_session.refresh(recipe)
        assert recipe.title == "Admin Edit"

    def test_other_member_cannot_update(self, client, db_session, recipe):
        """Fremder Member darf nicht editieren (nur eigene oder Admin)."""
        # Zweiter Member
        other = models.User(
            name="Other",
            email="other@example.com",
            password="dummy",
            role="member",
            is_verified=True,
        )
        db_session.add(other)
        db_session.commit()
        from auth import create_token
        token = create_token({"sub": other.email})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.patch(f"/recipes/{recipe.id}", headers=headers, json={
            "title": "Hack",
            "servings": 1,
        })
        assert response.status_code == 403


class TestDeleteRecipe:
    def test_admin_deletes(self, client, admin_headers, recipe, db_session):
        response = client.delete(f"/recipes/{recipe.id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.Recipe).filter_by(id=recipe.id).first() is None

    def test_member_cannot_delete_even_own(self, client, auth_headers, recipe):
        """Laut recipes.py darf NUR Admin löschen (auch der Autor nicht)."""
        response = client.delete(f"/recipes/{recipe.id}", headers=auth_headers)
        assert response.status_code == 403


class TestRecipeSearch:
    def test_search_by_title(self, client, auth_headers, recipe):
        response = client.get("/recipes?q=Test", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_search_by_ingredient(self, client, auth_headers, recipe):
        response = client.get("/recipes?q=Mehl", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_search_no_match(self, client, auth_headers, recipe):
        response = client.get("/recipes?q=XYZ123", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_filter_by_tag(self, client, auth_headers, db_session, recipe, tag):
        recipe.tags.append(tag)
        db_session.commit()

        response = client.get(f"/recipes?tag_ids={tag.id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_invalid_tag_ids(self, client, auth_headers):
        response = client.get("/recipes?tag_ids=abc,def", headers=auth_headers)
        assert response.status_code == 400

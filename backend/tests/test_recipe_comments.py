import pytest

import models
from auth import hash_password, create_token


# ---------- Helpers ----------

def _make_user(db_session, email, role="member"):
    u = models.User(
        name=email.split("@")[0].title(),
        email=email,
        password=hash_password("Password123!"),
        role=role,
        is_verified=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def _headers_for(user):
    return {"Authorization": f"Bearer {create_token({'sub': user.email})}"}


def _make_comment(db_session, recipe_id, user_id, content="Lecker!"):
    c = models.RecipeComment(
        recipe_id=recipe_id,
        user_id=user_id,
        content=content,
    )
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


# ---------- GET ----------

class TestListComments:
    def test_member_lists_empty(self, client, auth_headers, recipe):
        response = client.get(f"/recipes/{recipe.id}/comments", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_member_lists_comments(self, client, auth_headers, recipe, test_user, db_session):
        _make_comment(db_session, recipe.id, test_user.id, "Erster")
        _make_comment(db_session, recipe.id, test_user.id, "Zweiter")
        response = client.get(f"/recipes/{recipe.id}/comments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["content"] == "Erster"
        assert data[1]["content"] == "Zweiter"
        assert data[0]["user_name"] == "Test User"
        assert data[0]["edited"] is False

    def test_household_can_read(self, client, household_headers, recipe):
        response = client.get(f"/recipes/{recipe.id}/comments", headers=household_headers)
        assert response.status_code == 200

    def test_admin_can_read(self, client, admin_headers, recipe):
        response = client.get(f"/recipes/{recipe.id}/comments", headers=admin_headers)
        assert response.status_code == 200

    def test_guest_forbidden(self, client, guest_headers, recipe):
        response = client.get(f"/recipes/{recipe.id}/comments", headers=guest_headers)
        assert response.status_code == 403

    def test_unauthenticated_forbidden(self, client, recipe):
        response = client.get(f"/recipes/{recipe.id}/comments")
        assert response.status_code == 401

    def test_nonexistent_recipe(self, client, auth_headers):
        response = client.get("/recipes/99999/comments", headers=auth_headers)
        assert response.status_code == 404


# ---------- POST ----------

class TestCreateComment:
    def test_member_creates_comment(self, client, auth_headers, recipe, db_session):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=auth_headers,
            json={"content": "Schmeckt super!"},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["content"] == "Schmeckt super!"
        assert body["edited"] is False
        assert body["user_name"] == "Test User"

        in_db = db_session.query(models.RecipeComment).filter_by(id=body["id"]).first()
        assert in_db is not None
        assert in_db.content == "Schmeckt super!"

    def test_household_can_comment(self, client, household_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=household_headers,
            json={"content": "Top!"},
        )
        assert response.status_code == 201

    def test_admin_can_comment(self, client, admin_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=admin_headers,
            json={"content": "Sehr gut"},
        )
        assert response.status_code == 201

    def test_guest_forbidden(self, client, guest_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=guest_headers,
            json={"content": "Hi"},
        )
        assert response.status_code == 403

    def test_unauthenticated_forbidden(self, client, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            json={"content": "Hi"},
        )
        assert response.status_code == 401

    def test_empty_content_rejected(self, client, auth_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=auth_headers,
            json={"content": ""},
        )
        assert response.status_code == 422

    def test_whitespace_only_rejected(self, client, auth_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=auth_headers,
            json={"content": "   \n\t  "},
        )
        assert response.status_code == 422

    def test_too_long_rejected(self, client, auth_headers, recipe):
        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=auth_headers,
            json={"content": "x" * 2001},
        )
        assert response.status_code == 422

    def test_nonexistent_recipe(self, client, auth_headers):
        response = client.post(
            "/recipes/99999/comments",
            headers=auth_headers,
            json={"content": "Hi"},
        )
        assert response.status_code == 404


# ---------- PATCH ----------

class TestUpdateComment:
    def test_owner_updates_own(self, client, auth_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id, "Alt")
        response = client.patch(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=auth_headers,
            json={"content": "Neu"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["content"] == "Neu"
        assert body["edited"] is True

    def test_no_change_keeps_edited_false(self, client, auth_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id, "Gleich")
        response = client.patch(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=auth_headers,
            json={"content": "Gleich"},
        )
        assert response.status_code == 200
        assert response.json()["edited"] is False

    def test_member_cannot_update_others(self, client, auth_headers, recipe, db_session):
        other = _make_user(db_session, "other@example.com", role="member")
        c = _make_comment(db_session, recipe.id, other.id, "Fremd")
        response = client.patch(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=auth_headers,
            json={"content": "Hijack"},
        )
        assert response.status_code == 403

    def test_admin_can_update_others(self, client, admin_headers, recipe, db_session):
        other = _make_user(db_session, "other@example.com", role="member")
        c = _make_comment(db_session, recipe.id, other.id, "Original")
        response = client.patch(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=admin_headers,
            json={"content": "Moderiert"},
        )
        assert response.status_code == 200
        assert response.json()["content"] == "Moderiert"
        assert response.json()["edited"] is True

    def test_guest_forbidden(self, client, guest_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id)
        response = client.patch(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=guest_headers,
            json={"content": "x"},
        )
        assert response.status_code == 403

    def test_nonexistent_comment(self, client, auth_headers, recipe):
        response = client.patch(
            f"/recipes/{recipe.id}/comments/99999",
            headers=auth_headers,
            json={"content": "x"},
        )
        assert response.status_code == 404


# ---------- DELETE ----------

class TestDeleteComment:
    def test_owner_deletes_own(self, client, auth_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id)
        comment_id = c.id
        response = client.delete(
            f"/recipes/{recipe.id}/comments/{comment_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204
        # Body MUSS leer sein — Frontend-api()-Wrapper würde sonst beim
        # JSON-Parse einen "Unexpected end of JSON input"-Fehler werfen.
        assert response.content == b""
        assert db_session.query(models.RecipeComment).filter_by(id=comment_id).first() is None

    def test_member_cannot_delete_others(self, client, auth_headers, recipe, db_session):
        other = _make_user(db_session, "other@example.com", role="member")
        c = _make_comment(db_session, recipe.id, other.id)
        response = client.delete(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_admin_can_delete_others(self, client, admin_headers, recipe, db_session):
        other = _make_user(db_session, "other@example.com", role="member")
        c = _make_comment(db_session, recipe.id, other.id)
        comment_id = c.id
        response = client.delete(
            f"/recipes/{recipe.id}/comments/{comment_id}",
            headers=admin_headers,
        )
        assert response.status_code == 204
        assert db_session.query(models.RecipeComment).filter_by(id=comment_id).first() is None

    def test_guest_forbidden(self, client, guest_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id)
        response = client.delete(
            f"/recipes/{recipe.id}/comments/{c.id}",
            headers=guest_headers,
        )
        assert response.status_code == 403

    def test_nonexistent_comment(self, client, auth_headers, recipe):
        response = client.delete(
            f"/recipes/{recipe.id}/comments/99999",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ---------- Cascading & SET NULL ----------

# Diese Tests prüfen ON DELETE CASCADE / SET NULL — wird in SQLite nicht zuverlässig
# durchgesetzt (FK-Pragma + ORM-Verhalten weichen ab). Verifiziert wird dieses
# Verhalten ohnehin in der Migration gegen frische Postgres (siehe Schritt 6) und
# in E2E-Tests gegen echte DB.
@pytest.mark.skip(reason="ON DELETE behavior not enforced by SQLite in-memory; verified on Postgres in migration test + E2E")
class TestCascadeBehavior:
    def test_recipe_delete_cascades_comments(self, client, auth_headers, recipe, test_user, db_session):
        c = _make_comment(db_session, recipe.id, test_user.id)
        comment_id = c.id
        # Recipe direkt aus DB löschen (Recipe-Owner darf via API löschen, aber wir testen ORM-Level)
        db_session.delete(recipe)
        db_session.commit()
        assert db_session.query(models.RecipeComment).filter_by(id=comment_id).first() is None

    def test_user_delete_sets_user_id_null(self, client, recipe, db_session):
        author = _make_user(db_session, "author@example.com", role="member")
        c = _make_comment(db_session, recipe.id, author.id, "Hinterlassener Kommentar")
        comment_id = c.id

        db_session.delete(author)
        db_session.commit()

        c_after = db_session.query(models.RecipeComment).filter_by(id=comment_id).first()
        assert c_after is not None
        assert c_after.user_id is None

        # Serializer-Verhalten via API checken
        member = _make_user(db_session, "reader@example.com", role="member")
        response = client.get(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(member),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_name"] == "Gelöschter Nutzer"
        assert data[0]["user_id"] is None

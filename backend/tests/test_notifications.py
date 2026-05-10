"""
Tests für Notifications-Feature.

Deckt ab:
- Notification wird beim Comment-Create für Recipe-Author angelegt
- Owner-Selbst-Kommentar erzeugt KEINE Notification
- GET /notifications, /notifications/unread-count
- PATCH /notifications/{id}/read und /read-all
- Auth-Boundaries (guest, andere User dürfen nicht zugreifen)
- Comment-Count im Recipe-List + -Detail
"""
import models
from auth import hash_password, create_token


# ---------- Helpers ----------

def _make_user(db_session, email, name=None, role="member"):
    u = models.User(
        name=name or email.split("@")[0].title(),
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


def _make_recipe(db_session, author):
    r = models.Recipe(
        title="Test Recipe by " + author.name,
        servings=4,
        servings_unit="Portionen",
        author_id=author.id,
    )
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r


# ---------- Notification-Trigger beim Comment-Create ----------

class TestCommentCreatesNotification:
    def test_comment_by_other_user_creates_notification(
        self, client, db_session, test_user
    ):
        """test_user (Author des Rezepts) soll Notification bekommen,
        wenn ein anderer Member kommentiert."""
        recipe = _make_recipe(db_session, author=test_user)
        commenter = _make_user(db_session, "commenter@example.com", "Commenter")

        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(commenter),
            json={"content": "Sehr lecker!"},
        )
        assert response.status_code == 201
        comment_id = response.json()["id"]

        notifs = (
            db_session.query(models.Notification)
            .filter(models.Notification.user_id == test_user.id)
            .all()
        )
        assert len(notifs) == 1
        n = notifs[0]
        assert n.type == models.NotificationType.recipe_comment
        assert n.read is False
        assert n.payload["recipe_id"] == recipe.id
        assert n.payload["recipe_title"] == recipe.title
        assert n.payload["comment_id"] == comment_id
        assert n.payload["actor_id"] == commenter.id
        assert n.payload["actor_name"] == "Commenter"

    def test_owner_self_comment_does_not_create_notification(
        self, client, db_session, test_user
    ):
        """Wenn der Author selbst kommentiert, gibt es keine Notification."""
        recipe = _make_recipe(db_session, author=test_user)

        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Selbstgespräch"},
        )
        assert response.status_code == 201

        notifs = (
            db_session.query(models.Notification)
            .filter(models.Notification.user_id == test_user.id)
            .all()
        )
        assert len(notifs) == 0

    def test_household_comment_creates_notification(
        self, client, db_session, test_user, household_user
    ):
        """Auch Household-Kommentare lösen eine Notification aus."""
        recipe = _make_recipe(db_session, author=test_user)

        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(household_user),
            json={"content": "Auch lecker"},
        )
        assert response.status_code == 201

        count = (
            db_session.query(models.Notification)
            .filter(models.Notification.user_id == test_user.id)
            .count()
        )
        assert count == 1

    def test_admin_comment_creates_notification(
        self, client, db_session, test_user, admin_user
    ):
        recipe = _make_recipe(db_session, author=test_user)

        response = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(admin_user),
            json={"content": "Top!"},
        )
        assert response.status_code == 201
        assert (
            db_session.query(models.Notification)
            .filter(models.Notification.user_id == test_user.id)
            .count()
            == 1
        )


# ---------- GET /notifications ----------

class TestListNotifications:
    def test_empty_list(self, client, auth_headers):
        response = client.get("/notifications", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 5
        assert body["offset"] == 0

    def test_returns_only_own_notifications(
        self, client, db_session, test_user, household_user, auth_headers
    ):
        # Eine Notification für test_user
        n1 = models.Notification(
            user_id=test_user.id,
            type=models.NotificationType.recipe_comment,
            payload={"recipe_id": 1, "comment_id": 1, "actor_id": 99,
                     "actor_name": "X", "recipe_title": "R"},
        )
        # Eine für household_user (darf NICHT in test_users Liste auftauchen)
        n2 = models.Notification(
            user_id=household_user.id,
            type=models.NotificationType.recipe_comment,
            payload={"recipe_id": 2, "comment_id": 2, "actor_id": 88,
                     "actor_name": "Y", "recipe_title": "R2"},
        )
        db_session.add_all([n1, n2])
        db_session.commit()

        response = client.get("/notifications", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert len(body["items"]) == 1
        assert body["items"][0]["payload"]["recipe_id"] == 1

    def test_limit_and_offset(
        self, client, db_session, test_user, auth_headers
    ):
        # 7 Notifications anlegen
        for i in range(7):
            db_session.add(models.Notification(
                user_id=test_user.id,
                type=models.NotificationType.recipe_comment,
                payload={"recipe_id": i, "comment_id": i, "actor_id": 1,
                         "actor_name": "A", "recipe_title": f"R{i}"},
            ))
        db_session.commit()

        # Default limit=5
        r = client.get("/notifications", headers=auth_headers)
        body = r.json()
        assert body["total"] == 7
        assert len(body["items"]) == 5

        # Mehr laden mit offset=5
        r = client.get("/notifications?offset=5", headers=auth_headers)
        body = r.json()
        assert len(body["items"]) == 2

        # Custom limit
        r = client.get("/notifications?limit=3", headers=auth_headers)
        body = r.json()
        assert len(body["items"]) == 3

    def test_unread_only(self, client, db_session, test_user, auth_headers):
        # 1 read, 2 unread
        for i, read in enumerate([True, False, False]):
            db_session.add(models.Notification(
                user_id=test_user.id,
                type=models.NotificationType.recipe_comment,
                payload={"recipe_id": i, "comment_id": i, "actor_id": 1,
                         "actor_name": "A", "recipe_title": f"R{i}"},
                read=read,
            ))
        db_session.commit()

        r = client.get("/notifications?unread_only=true", headers=auth_headers)
        body = r.json()
        assert body["total"] == 2

    def test_guest_forbidden(self, client, guest_headers):
        response = client.get("/notifications", headers=guest_headers)
        assert response.status_code == 403

    def test_unauthenticated(self, client):
        response = client.get("/notifications")
        assert response.status_code == 401


# ---------- GET /notifications/unread-count ----------

class TestUnreadCount:
    def test_zero(self, client, auth_headers):
        response = client.get("/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"count": 0}

    def test_counts_only_unread(
        self, client, db_session, test_user, auth_headers
    ):
        for read in [True, False, False, False]:
            db_session.add(models.Notification(
                user_id=test_user.id,
                type=models.NotificationType.recipe_comment,
                payload={"recipe_id": 1, "comment_id": 1, "actor_id": 1,
                         "actor_name": "A", "recipe_title": "R"},
                read=read,
            ))
        db_session.commit()

        response = client.get("/notifications/unread-count", headers=auth_headers)
        assert response.json() == {"count": 3}


# ---------- PATCH /notifications/{id}/read ----------

class TestMarkRead:
    def test_mark_single_read(self, client, db_session, test_user, auth_headers):
        n = models.Notification(
            user_id=test_user.id,
            type=models.NotificationType.recipe_comment,
            payload={"recipe_id": 1, "comment_id": 1, "actor_id": 1,
                     "actor_name": "A", "recipe_title": "R"},
        )
        db_session.add(n)
        db_session.commit()
        db_session.refresh(n)
        assert n.read is False

        response = client.patch(f"/notifications/{n.id}/read", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"id": n.id, "read": True}

        db_session.refresh(n)
        assert n.read is True

    def test_cannot_mark_others_notification(
        self, client, db_session, household_user, auth_headers
    ):
        """test_user darf household_users Notification nicht markieren."""
        n = models.Notification(
            user_id=household_user.id,
            type=models.NotificationType.recipe_comment,
            payload={"recipe_id": 1, "comment_id": 1, "actor_id": 1,
                     "actor_name": "A", "recipe_title": "R"},
        )
        db_session.add(n)
        db_session.commit()
        db_session.refresh(n)

        response = client.patch(f"/notifications/{n.id}/read", headers=auth_headers)
        assert response.status_code == 404

    def test_nonexistent(self, client, auth_headers):
        response = client.patch("/notifications/99999/read", headers=auth_headers)
        assert response.status_code == 404


# ---------- PATCH /notifications/read-all ----------

class TestMarkAllRead:
    def test_marks_all_unread(self, client, db_session, test_user, auth_headers):
        for read in [True, False, False, False]:
            db_session.add(models.Notification(
                user_id=test_user.id,
                type=models.NotificationType.recipe_comment,
                payload={"recipe_id": 1, "comment_id": 1, "actor_id": 1,
                         "actor_name": "A", "recipe_title": "R"},
                read=read,
            ))
        db_session.commit()

        response = client.patch("/notifications/read-all", headers=auth_headers)
        assert response.status_code == 200
        # 3 unread waren da
        assert response.json()["updated"] == 3

        # Jetzt sollten 0 unread übrig sein
        r = client.get("/notifications/unread-count", headers=auth_headers)
        assert r.json() == {"count": 0}

    def test_does_not_touch_other_users(
        self, client, db_session, test_user, household_user, auth_headers
    ):
        """read-all darf NUR die eigenen Notifications betreffen."""
        # household_user hat 1 unread
        n_other = models.Notification(
            user_id=household_user.id,
            type=models.NotificationType.recipe_comment,
            payload={"recipe_id": 1, "comment_id": 1, "actor_id": 1,
                     "actor_name": "A", "recipe_title": "R"},
        )
        db_session.add(n_other)
        db_session.commit()
        db_session.refresh(n_other)

        # test_user ruft read-all auf
        client.patch("/notifications/read-all", headers=auth_headers)

        # household_users Notification bleibt unread
        db_session.refresh(n_other)
        assert n_other.read is False


# ---------- Comment-Count in Recipe-Endpoints ----------

class TestRecipeCommentCount:
    def test_list_includes_zero_count(self, client, recipe, auth_headers):
        response = client.get("/recipes", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        assert len(items) >= 1
        target = next(r for r in items if r["id"] == recipe.id)
        assert target["comment_count"] == 0

    def test_list_counts_comments(
        self, client, recipe, test_user, db_session, auth_headers
    ):
        for content in ["A", "B", "C"]:
            db_session.add(models.RecipeComment(
                recipe_id=recipe.id,
                user_id=test_user.id,
                content=content,
            ))
        db_session.commit()

        response = client.get("/recipes", headers=auth_headers)
        target = next(r for r in response.json() if r["id"] == recipe.id)
        assert target["comment_count"] == 3

    def test_detail_includes_count(
        self, client, recipe, test_user, db_session, auth_headers
    ):
        for content in ["A", "B"]:
            db_session.add(models.RecipeComment(
                recipe_id=recipe.id,
                user_id=test_user.id,
                content=content,
            ))
        db_session.commit()

        response = client.get(f"/recipes/{recipe.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["comment_count"] == 2

    def test_count_isolates_per_recipe(
        self, client, db_session, test_user, auth_headers
    ):
        """Comments für Rezept A zählen nicht für Rezept B."""
        r_a = _make_recipe(db_session, author=test_user)
        r_b = _make_recipe(db_session, author=test_user)
        for _ in range(3):
            db_session.add(models.RecipeComment(
                recipe_id=r_a.id, user_id=test_user.id, content="x"
            ))
        db_session.add(models.RecipeComment(
            recipe_id=r_b.id, user_id=test_user.id, content="y"
        ))
        db_session.commit()

        items = client.get("/recipes", headers=auth_headers).json()
        by_id = {r["id"]: r for r in items}
        assert by_id[r_a.id]["comment_count"] == 3
        assert by_id[r_b.id]["comment_count"] == 1


# ---------- Reply-Notifications ----------

class TestReplyCreatesNotification:
    def test_reply_notifies_parent_author(self, client, db_session, test_user):
        """Reply auf einen fremden Kommentar erzeugt eine recipe_comment_reply-Notif
        für den Parent-Comment-Autor."""
        owner = _make_user(db_session, "owner@example.com", "Owner")
        recipe = _make_recipe(db_session, author=owner)

        # test_user legt Top-Level an (löst recipe_comment für owner aus)
        parent_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Top-Level"},
        )
        assert parent_resp.status_code == 201
        parent_id = parent_resp.json()["id"]

        # Dritter User antwortet
        replier = _make_user(db_session, "replier@example.com", "Replier")
        reply_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(replier),
            json={"content": "Antwort", "parent_id": parent_id},
        )
        assert reply_resp.status_code == 201
        reply_id = reply_resp.json()["id"]

        # test_user (Parent-Autor) hat genau eine Reply-Notif
        reply_notifs = (
            db_session.query(models.Notification)
            .filter(
                models.Notification.user_id == test_user.id,
                models.Notification.type
                == models.NotificationType.recipe_comment_reply,
            )
            .all()
        )
        assert len(reply_notifs) == 1
        n = reply_notifs[0]
        assert n.read is False
        assert n.payload["recipe_id"] == recipe.id
        assert n.payload["recipe_title"] == recipe.title
        assert n.payload["comment_id"] == reply_id
        assert n.payload["parent_comment_id"] == parent_id
        assert n.payload["actor_id"] == replier.id
        assert n.payload["actor_name"] == "Replier"

    def test_self_reply_does_not_notify(self, client, db_session, test_user):
        """Reply auf eigenen Kommentar erzeugt KEINE Reply-Notif."""
        owner = _make_user(db_session, "owner@example.com", "Owner")
        recipe = _make_recipe(db_session, author=owner)

        parent_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Top"},
        )
        parent_id = parent_resp.json()["id"]

        client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Selbst-Antwort", "parent_id": parent_id},
        )

        reply_notifs = (
            db_session.query(models.Notification)
            .filter(
                models.Notification.user_id == test_user.id,
                models.Notification.type
                == models.NotificationType.recipe_comment_reply,
            )
            .all()
        )
        assert reply_notifs == []

    def test_reply_in_third_party_recipe_notifies_owner_and_parent_author(
        self, client, db_session, test_user
    ):
        """Reply in fremdem Rezept: Parent-Autor und Recipe-Owner sind verschieden
        → beide bekommen eine Notif (Reply-Typ bzw. Comment-Typ)."""
        owner = _make_user(db_session, "owner@example.com", "Owner")
        recipe = _make_recipe(db_session, author=owner)

        # test_user legt Top-Level an
        parent_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Top"},
        )
        parent_id = parent_resp.json()["id"]
        # Owner sollte exakt 1 recipe_comment-Notif haben
        assert (
            db_session.query(models.Notification).filter_by(user_id=owner.id).count()
            == 1
        )

        # Dritter antwortet
        replier = _make_user(db_session, "replier@example.com", "Replier")
        client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(replier),
            json={"content": "Antwort", "parent_id": parent_id},
        )

        # test_user (Parent-Autor): 1 Reply-Notif
        test_user_notifs = (
            db_session.query(models.Notification)
            .filter_by(user_id=test_user.id)
            .all()
        )
        assert len(test_user_notifs) == 1
        assert test_user_notifs[0].type == models.NotificationType.recipe_comment_reply

        # Owner: 2 Comment-Notifs (Top-Level + Reply, beide Typ recipe_comment)
        owner_notifs = (
            db_session.query(models.Notification).filter_by(user_id=owner.id).all()
        )
        assert len(owner_notifs) == 2
        assert all(
            n.type == models.NotificationType.recipe_comment for n in owner_notifs
        )

    def test_dedupe_when_owner_is_parent_author(self, client, db_session, test_user):
        """Wenn Recipe-Owner == Parent-Comment-Autor: nur Reply-Notif, keine
        zusätzliche Comment-Notif (vermeidet Doppel-Benachrichtigung)."""
        recipe = _make_recipe(db_session, author=test_user)

        # test_user legt eigenen Top-Level an (kein Notif für sich)
        parent_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Top"},
        )
        parent_id = parent_resp.json()["id"]
        assert (
            db_session.query(models.Notification)
            .filter_by(user_id=test_user.id)
            .count()
            == 0
        )

        replier = _make_user(db_session, "replier@example.com", "Replier")
        client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(replier),
            json={"content": "Antwort", "parent_id": parent_id},
        )

        # GENAU eine Notif: Reply, nicht Reply + Comment
        notifs = (
            db_session.query(models.Notification)
            .filter_by(user_id=test_user.id)
            .all()
        )
        assert len(notifs) == 1
        assert notifs[0].type == models.NotificationType.recipe_comment_reply

    def test_owner_self_reply_in_own_recipe_no_self_notif(
        self, client, db_session, test_user
    ):
        """Owner antwortet auf fremden Kommentar in eigenem Rezept → keine Self-Notif."""
        recipe = _make_recipe(db_session, author=test_user)

        commenter = _make_user(db_session, "commenter@example.com", "Commenter")
        parent_resp = client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(commenter),
            json={"content": "Top"},
        )
        parent_id = parent_resp.json()["id"]

        # Owner (test_user) antwortet
        client.post(
            f"/recipes/{recipe.id}/comments",
            headers=_headers_for(test_user),
            json={"content": "Antwort", "parent_id": parent_id},
        )

        # commenter bekommt Reply-Notif
        commenter_notifs = (
            db_session.query(models.Notification)
            .filter_by(user_id=commenter.id)
            .all()
        )
        assert len(commenter_notifs) == 1
        assert (
            commenter_notifs[0].type == models.NotificationType.recipe_comment_reply
        )

        # test_user hat NUR die Original-Comment-Notif, keine Self-Reply-Notif
        test_user_notifs = (
            db_session.query(models.Notification)
            .filter_by(user_id=test_user.id)
            .all()
        )
        assert len(test_user_notifs) == 1
        assert test_user_notifs[0].type == models.NotificationType.recipe_comment

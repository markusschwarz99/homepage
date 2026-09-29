from io import BytesIO

import pytest
from PIL import Image

import models
from auth import hash_password, create_token


@pytest.fixture
def hongar_user(db_session):
    user = models.User(
        name="Hongar Redaktion",
        email="hongar@example.com",
        password=hash_password("HongarPassword123!"),
        role="hongar",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def hongar_headers(hongar_user):
    return {"Authorization": f"Bearer {create_token({'sub': hongar_user.email})}"}


@pytest.fixture
def private_mode(monkeypatch):
    monkeypatch.setenv("HONGAR_PUBLIC", "false")


@pytest.fixture
def public_mode(monkeypatch):
    monkeypatch.setenv("HONGAR_PUBLIC", "true")


def _page(db_session, slug="start", published=True, parent_id=None, position=0):
    page = models.HongarPage(
        slug=slug,
        title=slug.title(),
        parent_id=parent_id,
        position=position,
        content_html="<p>Inhalt</p>",
        is_published=published,
    )
    db_session.add(page)
    db_session.commit()
    db_session.refresh(page)
    return page


def _png_bytes():
    buf = BytesIO()
    Image.new("RGB", (4, 4), "green").save(buf, format="PNG")
    buf.seek(0)
    return buf


class TestConfig:
    def test_default_is_private(self, client, monkeypatch):
        monkeypatch.delenv("HONGAR_PUBLIC", raising=False)
        assert client.get("/hongar/config").json() == {"public": False}

    def test_public_flag(self, client, public_mode):
        assert client.get("/hongar/config").json() == {"public": True}


class TestLoginGate:
    def test_no_token_401(self, client, private_mode, db_session):
        _page(db_session)
        assert client.get("/hongar/pages").status_code == 401
        assert client.get("/hongar/pages/start").status_code == 401
        assert client.get("/hongar/settings").status_code == 401

    def test_guest_and_member_403(self, client, private_mode, guest_headers, auth_headers):
        assert client.get("/hongar/pages", headers=guest_headers).status_code == 403
        assert client.get("/hongar/pages", headers=auth_headers).status_code == 403

    def test_hongar_and_admin_allowed(self, client, private_mode, hongar_headers, admin_headers):
        assert client.get("/hongar/pages", headers=hongar_headers).status_code == 200
        assert client.get("/hongar/pages", headers=admin_headers).status_code == 200

    def test_public_mode_open(self, client, public_mode, db_session):
        _page(db_session)
        assert client.get("/hongar/pages").status_code == 200
        assert client.get("/hongar/pages/start").status_code == 200
        assert client.get("/hongar/settings").status_code == 200


class TestPublicRead:
    def test_only_published_listed(self, client, public_mode, db_session):
        _page(db_session, "start")
        _page(db_session, "entwurf", published=False)
        slugs = [p["slug"] for p in client.get("/hongar/pages").json()]
        assert slugs == ["start"]

    def test_draft_detail_404(self, client, public_mode, db_session):
        _page(db_session, "entwurf", published=False)
        assert client.get("/hongar/pages/entwurf").status_code == 404

    def test_detail_contains_gallery(self, client, public_mode, db_session):
        page = _page(db_session)
        db_session.add(models.HongarPageImage(page_id=page.id, filename="hongar_" + "a" * 32 + ".jpg", caption="Stube"))
        db_session.commit()
        data = client.get("/hongar/pages/start").json()
        assert data["images"][0]["url"] == "/uploads/hongar_" + "a" * 32 + ".jpg"
        assert data["images"][0]["caption"] == "Stube"


class TestEditorPermissions:
    def test_member_cannot_write(self, client, auth_headers):
        r = client.post("/hongar/pages", headers=auth_headers, json={"slug": "x", "title": "X"})
        assert r.status_code == 403

    def test_guest_cannot_write_settings(self, client, guest_headers):
        r = client.patch("/hongar/settings", headers=guest_headers, json={"news": "x"})
        assert r.status_code == 403

    def test_admin_list_includes_drafts(self, client, hongar_headers, db_session):
        _page(db_session, "start")
        _page(db_session, "entwurf", published=False)
        slugs = {p["slug"] for p in client.get("/hongar/admin/pages", headers=hongar_headers).json()}
        assert slugs == {"start", "entwurf"}

    def test_hongar_role_not_member(self, client, hongar_headers):
        # hongar-Redaktion bekommt keinen Zugriff auf Haushalts-/Member-Bereiche
        assert client.post(
            "/improvements",
            headers=hongar_headers,
            json={"title": "t", "category": "idee", "description": "d"},
        ).status_code == 403


class TestPageCrud:
    def test_create_sanitizes_html(self, client, hongar_headers):
        r = client.post("/hongar/pages", headers=hongar_headers, json={
            "slug": "Geschichte",
            "title": "Geschichte",
            "content_html": '<p style="text-align: center; color: red">Hallo</p>'
                            '<script>alert(1)</script><img src="x" onerror="alert(1)">'
                            '<a href="javascript:alert(1)">x</a>',
        })
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == "geschichte"
        assert data["is_published"] is False
        html = data["content_html"]
        assert "<script" not in html
        assert "onerror" not in html
        assert "javascript:" not in html
        assert "text-align" in html
        assert "color" not in html

    def test_invalid_slug_422(self, client, hongar_headers):
        r = client.post("/hongar/pages", headers=hongar_headers, json={"slug": "a b", "title": "X"})
        assert r.status_code == 422

    def test_reserved_slug_422(self, client, hongar_headers):
        r = client.post("/hongar/pages", headers=hongar_headers, json={"slug": "admin", "title": "X"})
        assert r.status_code == 422

    def test_duplicate_slug_409(self, client, hongar_headers, db_session):
        _page(db_session, "start")
        r = client.post("/hongar/pages", headers=hongar_headers, json={"slug": "start", "title": "X"})
        assert r.status_code == 409

    def test_update_and_publish(self, client, hongar_headers, db_session):
        page = _page(db_session, "start", published=False)
        r = client.patch(f"/hongar/pages/{page.id}", headers=hongar_headers, json={
            "title": "Willkommen", "is_published": True,
        })
        assert r.status_code == 200
        assert r.json()["title"] == "Willkommen"
        assert r.json()["is_published"] is True

    def test_parent_only_one_level(self, client, hongar_headers, db_session):
        top = _page(db_session, "almgasthof")
        child = _page(db_session, "geschichte", parent_id=top.id)
        r = client.post("/hongar/pages", headers=hongar_headers, json={
            "slug": "enkel", "title": "Enkel", "parent_id": child.id,
        })
        assert r.status_code == 400

    def test_page_with_children_cannot_become_child(self, client, hongar_headers, db_session):
        top = _page(db_session, "almgasthof")
        _page(db_session, "geschichte", parent_id=top.id)
        other = _page(db_session, "aktivitaeten")
        r = client.patch(f"/hongar/pages/{top.id}", headers=hongar_headers, json={"parent_id": other.id})
        assert r.status_code == 400

    def test_invalid_cover_rejected(self, client, hongar_headers, db_session):
        page = _page(db_session)
        r = client.patch(f"/hongar/pages/{page.id}", headers=hongar_headers, json={"cover_image": "../../etc/passwd"})
        assert r.status_code == 400

    def test_reorder(self, client, hongar_headers, db_session):
        a = _page(db_session, "a", position=0)
        b = _page(db_session, "b", position=1)
        r = client.patch("/hongar/pages/reorder", headers=hongar_headers, json={"ids": [b.id, a.id]})
        assert r.status_code == 200
        slugs = [p["slug"] for p in client.get("/hongar/admin/pages", headers=hongar_headers).json()]
        assert slugs == ["b", "a"]

    def test_delete_detaches_children(self, client, hongar_headers, db_session):
        top = _page(db_session, "almgasthof")
        child = _page(db_session, "geschichte", parent_id=top.id)
        assert client.delete(f"/hongar/pages/{top.id}", headers=hongar_headers).status_code == 200
        db_session.expire_all()
        assert db_session.get(models.HongarPage, child.id).parent_id is None


class TestImages:
    def test_upload_image(self, client, hongar_headers):
        r = client.post("/hongar/images", headers=hongar_headers,
                        files={"file": ("bild.png", _png_bytes(), "image/png")})
        assert r.status_code == 200
        assert r.json()["filename"].startswith("hongar_")
        assert r.json()["url"].startswith("/uploads/hongar_")

    def test_gallery_add_caption_reorder_delete(self, client, hongar_headers, db_session):
        page = _page(db_session)
        ids = []
        for caption in ("Eins", "Zwei"):
            r = client.post(f"/hongar/pages/{page.id}/images", headers=hongar_headers,
                            files={"file": ("b.png", _png_bytes(), "image/png")},
                            data={"caption": caption})
            assert r.status_code == 200
            ids.append(r.json()["id"])

        r = client.patch(f"/hongar/pages/{page.id}/images/{ids[0]}", headers=hongar_headers, json={"caption": "Neu"})
        assert r.json()["caption"] == "Neu"

        r = client.patch(f"/hongar/pages/{page.id}/images/reorder", headers=hongar_headers, json={"ids": ids[::-1]})
        assert r.status_code == 200
        gallery = client.get(f"/hongar/admin/pages/{page.id}", headers=hongar_headers).json()["images"]
        assert [i["id"] for i in gallery] == ids[::-1]

        assert client.delete(f"/hongar/pages/{page.id}/images/{ids[0]}", headers=hongar_headers).status_code == 200
        gallery = client.get(f"/hongar/admin/pages/{page.id}", headers=hongar_headers).json()["images"]
        assert [i["id"] for i in gallery] == [ids[1]]

    def test_reorder_requires_full_list(self, client, hongar_headers, db_session):
        page = _page(db_session)
        r = client.patch(f"/hongar/pages/{page.id}/images/reorder", headers=hongar_headers, json={"ids": [999]})
        assert r.status_code == 400


class TestSettings:
    def test_update_and_read(self, client, public_mode, hongar_headers):
        r = client.patch("/hongar/settings", headers=hongar_headers, json={
            "news": "<p>Offen</p><script>x</script>",
            "facebook_url": "https://www.facebook.com/beispiel",
        })
        assert r.status_code == 200
        data = client.get("/hongar/settings").json()
        assert data["news"] == "<p>Offen</p>"
        assert data["facebook_url"] == "https://www.facebook.com/beispiel"
        assert data["opening_hours"] == ""

    def test_non_https_url_rejected(self, client, hongar_headers):
        r = client.patch("/hongar/settings", headers=hongar_headers, json={"booking_url": "javascript:alert(1)"})
        assert r.status_code == 400

    def test_settings_not_in_generic_settings_api(self, client):
        assert client.get("/settings/hongar_news").status_code == 404

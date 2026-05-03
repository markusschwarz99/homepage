"""Tests für Foto-Tagebuch-Endpoints (admin-only)."""
import io
from datetime import date, time

import pytest
from PIL import Image


# ---------- Helpers ----------

def _make_test_image(format: str = "JPEG", size=(800, 600), color=(120, 200, 80)) -> bytes:
    """Erzeugt ein gültiges Test-Bild (RGB) als Bytes."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def _create_entry(client, admin_headers, **overrides):
    payload = {"entry_date": "2026-05-01", "description": "Erster Eintrag"}
    payload.update(overrides)
    resp = client.post("/diary", json=payload, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------- Auth-Guard ----------

class TestAuthGuard:
    def test_anonymous_cannot_list(self, client):
        assert client.get("/diary").status_code == 401

    def test_guest_cannot_list(self, client, guest_headers):
        assert client.get("/diary", headers=guest_headers).status_code == 403

    def test_member_cannot_list(self, client, auth_headers):
        assert client.get("/diary", headers=auth_headers).status_code == 403

    def test_household_cannot_list(self, client, household_headers):
        assert client.get("/diary", headers=household_headers).status_code == 403

    def test_admin_can_list(self, client, admin_headers):
        assert client.get("/diary", headers=admin_headers).status_code == 200

    def test_member_cannot_create(self, client, auth_headers):
        resp = client.post(
            "/diary",
            json={"entry_date": "2026-05-01"},
            headers=auth_headers,
        )
        assert resp.status_code == 403


# ---------- Entry CRUD ----------

class TestEntryCRUD:
    def test_create_entry_minimal(self, client, admin_headers):
        resp = client.post(
            "/diary",
            json={"entry_date": "2026-05-01"},
            headers=admin_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["entry_date"] == "2026-05-01"
        assert data["description"] is None
        assert data["images"] == []
        assert "entry_time" in data  # default vom server

    def test_create_entry_with_description(self, client, admin_headers):
        data = _create_entry(client, admin_headers, description="Schöner Tag")
        assert data["description"] == "Schöner Tag"

    def test_create_entry_with_explicit_time(self, client, admin_headers):
        data = _create_entry(client, admin_headers, entry_time="14:30:00")
        assert data["entry_time"].startswith("14:30")

    def test_list_entries_sorted_desc(self, client, admin_headers):
        _create_entry(client, admin_headers, entry_date="2026-01-01")
        _create_entry(client, admin_headers, entry_date="2026-03-01")
        _create_entry(client, admin_headers, entry_date="2026-02-01")
        resp = client.get("/diary", headers=admin_headers)
        assert resp.status_code == 200
        dates = [e["entry_date"] for e in resp.json()]
        assert dates == ["2026-03-01", "2026-02-01", "2026-01-01"]

    def test_multiple_entries_per_day_sorted_by_time(self, client, admin_headers):
        _create_entry(client, admin_headers, entry_date="2026-05-01", entry_time="09:00:00")
        _create_entry(client, admin_headers, entry_date="2026-05-01", entry_time="18:00:00")
        _create_entry(client, admin_headers, entry_date="2026-05-01", entry_time="12:00:00")
        resp = client.get("/diary", headers=admin_headers)
        times = [e["entry_time"] for e in resp.json()]
        # Alle gleicher Tag, neueste Zeit zuerst
        assert times[0].startswith("18:")
        assert times[1].startswith("12:")
        assert times[2].startswith("09:")

    def test_list_filtered_by_date_range(self, client, admin_headers):
        _create_entry(client, admin_headers, entry_date="2026-01-15")
        _create_entry(client, admin_headers, entry_date="2026-02-15")
        _create_entry(client, admin_headers, entry_date="2026-03-15")
        resp = client.get(
            "/diary?from=2026-02-01&to=2026-02-28",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entry_date"] == "2026-02-15"

    def test_get_entry_by_id(self, client, admin_headers):
        created = _create_entry(client, admin_headers)
        resp = client.get(f"/diary/{created['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_unknown_entry_404(self, client, admin_headers):
        assert client.get("/diary/99999", headers=admin_headers).status_code == 404

    def test_update_entry(self, client, admin_headers):
        created = _create_entry(client, admin_headers, description="Alt")
        resp = client.patch(
            f"/diary/{created['id']}",
            json={"description": "Neu"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Neu"

    def test_update_partial_keeps_other_fields(self, client, admin_headers):
        created = _create_entry(client, admin_headers, description="Original")
        resp = client.patch(
            f"/diary/{created['id']}",
            json={"entry_date": "2026-12-31"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["entry_date"] == "2026-12-31"
        assert body["description"] == "Original"

    def test_delete_entry(self, client, admin_headers):
        created = _create_entry(client, admin_headers)
        resp = client.delete(f"/diary/{created['id']}", headers=admin_headers)
        assert resp.status_code == 204
        assert client.get(f"/diary/{created['id']}", headers=admin_headers).status_code == 404


# ---------- Image Upload ----------

class TestImageUpload:
    def test_upload_single_image(self, client, admin_headers):
        entry = _create_entry(client, admin_headers)
        img_bytes = _make_test_image()
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("foto.jpg", img_bytes, "image/jpeg"))],
            headers=admin_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert len(data) == 1
        assert data[0]["url"].startswith("/uploads/diary/")
        assert data[0]["url"].endswith(".webp")  # konvertiert
        assert data[0]["thumb_url"].startswith("/uploads/diary/thumbs/")
        assert data[0]["position"] == 0

    def test_upload_multiple_images_in_one_request(self, client, admin_headers):
        entry = _create_entry(client, admin_headers)
        files = [
            ("files", (f"f{i}.jpg", _make_test_image(color=(i*40, 100, 100)), "image/jpeg"))
            for i in range(3)
        ]
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=files,
            headers=admin_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 3
        positions = [img["position"] for img in data]
        assert positions == [0, 1, 2]

    def test_upload_appends_to_existing(self, client, admin_headers):
        entry = _create_entry(client, admin_headers)
        client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("a.jpg", _make_test_image(), "image/jpeg"))],
            headers=admin_headers,
        )
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("b.jpg", _make_test_image(color=(200, 0, 0)), "image/jpeg"))],
            headers=admin_headers,
        )
        assert resp.status_code == 201
        assert resp.json()[0]["position"] == 1

    def test_upload_to_unknown_entry_404(self, client, admin_headers):
        resp = client.post(
            "/diary/99999/images",
            files=[("files", ("x.jpg", _make_test_image(), "image/jpeg"))],
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_upload_rejects_invalid_format(self, client, admin_headers):
        entry = _create_entry(client, admin_headers)
        # GIF ist im Diary-Helper NICHT erlaubt
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("a.gif", _make_test_image(format="GIF"), "image/gif"))],
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_upload_rejects_non_image(self, client, admin_headers):
        entry = _create_entry(client, admin_headers)
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("a.jpg", b"not an image", "image/jpeg"))],
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_member_cannot_upload(self, client, auth_headers, admin_headers):
        entry = _create_entry(client, admin_headers)
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=[("files", ("a.jpg", _make_test_image(), "image/jpeg"))],
            headers=auth_headers,
        )
        assert resp.status_code == 403


# ---------- Image Update / Delete / Reorder ----------

class TestImageMutations:
    def _entry_with_images(self, client, admin_headers, n=3):
        entry = _create_entry(client, admin_headers)
        files = [
            ("files", (f"f{i}.jpg", _make_test_image(color=(i*60, 0, 0)), "image/jpeg"))
            for i in range(n)
        ]
        resp = client.post(
            f"/diary/{entry['id']}/images",
            files=files,
            headers=admin_headers,
        )
        return entry, resp.json()

    def test_update_caption(self, client, admin_headers):
        _, imgs = self._entry_with_images(client, admin_headers, n=1)
        resp = client.patch(
            f"/diary/images/{imgs[0]['id']}",
            json={"caption": "Sonnenaufgang"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["caption"] == "Sonnenaufgang"

    def test_update_caption_too_long(self, client, admin_headers):
        _, imgs = self._entry_with_images(client, admin_headers, n=1)
        resp = client.patch(
            f"/diary/images/{imgs[0]['id']}",
            json={"caption": "x" * 501},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_delete_single_image(self, client, admin_headers):
        entry, imgs = self._entry_with_images(client, admin_headers, n=2)
        resp = client.delete(f"/diary/images/{imgs[0]['id']}", headers=admin_headers)
        assert resp.status_code == 204
        # Nur noch ein Bild übrig
        entry_resp = client.get(f"/diary/{entry['id']}", headers=admin_headers)
        assert len(entry_resp.json()["images"]) == 1

    def test_reorder_images(self, client, admin_headers):
        entry, imgs = self._entry_with_images(client, admin_headers, n=3)
        new_order = [imgs[2]["id"], imgs[0]["id"], imgs[1]["id"]]
        resp = client.patch(
            f"/diary/{entry['id']}/images/reorder",
            json={"image_ids": new_order},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        ordered = resp.json()
        assert [img["id"] for img in ordered] == new_order
        assert [img["position"] for img in ordered] == [0, 1, 2]

    def test_reorder_rejects_incomplete_list(self, client, admin_headers):
        entry, imgs = self._entry_with_images(client, admin_headers, n=3)
        resp = client.patch(
            f"/diary/{entry['id']}/images/reorder",
            json={"image_ids": [imgs[0]["id"], imgs[1]["id"]]},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_reorder_rejects_foreign_image_id(self, client, admin_headers):
        entry, imgs = self._entry_with_images(client, admin_headers, n=2)
        resp = client.patch(
            f"/diary/{entry['id']}/images/reorder",
            json={"image_ids": [imgs[0]["id"], 99999]},
            headers=admin_headers,
        )
        assert resp.status_code == 400


# ---------- Cascade ----------

@pytest.mark.skip(
    reason="SQLite enforced FK CASCADE nicht zuverlässig in Tests "
    "— gegen Postgres via docker-compose.test.yml verifiziert"
)
def test_delete_entry_cascades_images(client, admin_headers, db_session):
    pass

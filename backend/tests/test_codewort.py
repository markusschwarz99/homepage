"""Tests für den Codewort-Router."""


# ---------- Helpers ----------

def _create_pack(client, admin_headers, name="Testpaket", is_active=True, sort_order=0):
    res = client.post(
        "/codewort/admin/packs",
        json={"name": name, "is_active": is_active, "sort_order": sort_order},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


def _add_words(client, admin_headers, pack_id, words):
    res = client.post(
        f"/codewort/admin/packs/{pack_id}/words",
        json={"words": words},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


def _pack_with_n_words(client, admin_headers, n, name="Vollpaket"):
    pack = _create_pack(client, admin_headers, name=name)
    _add_words(client, admin_headers, pack["id"], [f"Wort{i}" for i in range(n)])
    return pack


# ---------- Public Endpoints ----------

class TestPublicPacks:
    def test_list_packs_empty(self, client):
        res = client.get("/codewort/packs")
        assert res.status_code == 200
        assert res.json() == []

    def test_list_packs_excludes_inactive(self, client, admin_headers):
        active = _create_pack(client, admin_headers, name="Aktiv")
        inactive = _create_pack(client, admin_headers, name="Inaktiv", is_active=False)
        _add_words(client, admin_headers, active["id"], ["A"])
        _add_words(client, admin_headers, inactive["id"], ["B"])

        names = [p["name"] for p in client.get("/codewort/packs").json()]
        assert "Aktiv" in names
        assert "Inaktiv" not in names

    def test_list_packs_excludes_empty(self, client, admin_headers):
        with_words = _create_pack(client, admin_headers, name="MitWoertern")
        _create_pack(client, admin_headers, name="Leer")
        _add_words(client, admin_headers, with_words["id"], ["Foo"])

        names = [p["name"] for p in client.get("/codewort/packs").json()]
        assert "MitWoertern" in names
        assert "Leer" not in names

    def test_list_packs_reports_word_count(self, client, admin_headers):
        pack = _pack_with_n_words(client, admin_headers, 5)
        entry = next(p for p in client.get("/codewort/packs").json() if p["id"] == pack["id"])
        assert entry["word_count"] == 5


class TestDraw:
    def test_draw_returns_25_distinct_words(self, client, admin_headers):
        pack = _pack_with_n_words(client, admin_headers, 40)
        res = client.post("/codewort/draw", json={"pack_id": pack["id"]})
        assert res.status_code == 200, res.text
        data = res.json()
        assert len(data["words"]) == 25
        assert len(set(data["words"])) == 25
        assert data["pack_id"] == pack["id"]

    def test_draw_custom_count(self, client, admin_headers):
        pack = _pack_with_n_words(client, admin_headers, 40)
        res = client.post("/codewort/draw", json={"pack_id": pack["id"], "count": 10})
        assert res.status_code == 200
        assert len(res.json()["words"]) == 10

    def test_draw_missing_pack(self, client):
        res = client.post("/codewort/draw", json={"pack_id": 9999})
        assert res.status_code == 404

    def test_draw_inactive_pack(self, client, admin_headers):
        pack = _pack_with_n_words(client, admin_headers, 40)
        client.patch(
            f"/codewort/admin/packs/{pack['id']}",
            json={"is_active": False},
            headers=admin_headers,
        )
        res = client.post("/codewort/draw", json={"pack_id": pack["id"]})
        assert res.status_code == 404

    def test_draw_too_few_words(self, client, admin_headers):
        pack = _pack_with_n_words(client, admin_headers, 24)
        res = client.post("/codewort/draw", json={"pack_id": pack["id"]})
        assert res.status_code == 409

    def test_draw_prefers_non_excluded(self, client, admin_headers):
        # Genau 26 Wörter, eins wird ausgeschlossen → darf nie gezogen werden,
        # solange die übrigen 25 für eine volle Auslage reichen.
        pack = _pack_with_n_words(client, admin_headers, 26)
        res = client.post(
            "/codewort/draw",
            json={"pack_id": pack["id"], "exclude": ["Wort0"]},
        )
        assert res.status_code == 200
        assert "Wort0" not in res.json()["words"]

    def test_draw_falls_back_when_exclude_too_large(self, client, admin_headers):
        # 25 Wörter, aber alle ausgeschlossen → Meidung wird ignoriert,
        # es kommen trotzdem 25 verschiedene Wörter zurück.
        pack = _pack_with_n_words(client, admin_headers, 25)
        res = client.post(
            "/codewort/draw",
            json={"pack_id": pack["id"], "exclude": [f"Wort{i}" for i in range(25)]},
        )
        assert res.status_code == 200
        assert len(set(res.json()["words"])) == 25


# ---------- Admin: Packs ----------

class TestAdminPacks:
    def test_requires_admin(self, client, auth_headers):
        assert client.get("/codewort/admin/packs").status_code == 401
        assert client.get("/codewort/admin/packs", headers=auth_headers).status_code == 403

    def test_create_and_list(self, client, admin_headers):
        _create_pack(client, admin_headers, name="Neu")
        names = [p["name"] for p in client.get("/codewort/admin/packs", headers=admin_headers).json()]
        assert "Neu" in names

    def test_duplicate_name_rejected(self, client, admin_headers):
        _create_pack(client, admin_headers, name="Doppelt")
        res = client.post(
            "/codewort/admin/packs",
            json={"name": "Doppelt"},
            headers=admin_headers,
        )
        assert res.status_code == 409

    def test_update_rename(self, client, admin_headers):
        pack = _create_pack(client, admin_headers, name="Alt")
        res = client.patch(
            f"/codewort/admin/packs/{pack['id']}",
            json={"name": "Neu"},
            headers=admin_headers,
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Neu"

    def test_delete_cascades_words(self, client, admin_headers):
        pack = _create_pack(client, admin_headers, name="Weg")
        _add_words(client, admin_headers, pack["id"], ["X", "Y"])
        assert client.delete(
            f"/codewort/admin/packs/{pack['id']}", headers=admin_headers
        ).status_code == 204
        # Paket ist weg → Wörter-Endpoint liefert 404.
        assert client.get(
            f"/codewort/admin/packs/{pack['id']}/words", headers=admin_headers
        ).status_code == 404


# ---------- Admin: Words ----------

class TestAdminWords:
    def test_add_words_dedupes_case_insensitive(self, client, admin_headers):
        pack = _create_pack(client, admin_headers)
        _add_words(client, admin_headers, pack["id"], ["Apfel"])
        # "apfel" (andere Groß-/Kleinschreibung) gilt als Duplikat → alle raus.
        res = client.post(
            f"/codewort/admin/packs/{pack['id']}/words",
            json={"words": ["apfel"]},
            headers=admin_headers,
        )
        assert res.status_code == 409

    def test_add_words_partial_new(self, client, admin_headers):
        pack = _create_pack(client, admin_headers)
        _add_words(client, admin_headers, pack["id"], ["A"])
        res = client.post(
            f"/codewort/admin/packs/{pack['id']}/words",
            json={"words": ["A", "B"]},
            headers=admin_headers,
        )
        assert res.status_code == 201
        assert [w["word"] for w in res.json()] == ["B"]

    def test_delete_word(self, client, admin_headers):
        pack = _create_pack(client, admin_headers)
        words = _add_words(client, admin_headers, pack["id"], ["A", "B"])
        wid = words[0]["id"]
        assert client.delete(
            f"/codewort/admin/words/{wid}", headers=admin_headers
        ).status_code == 204
        remaining = client.get(
            f"/codewort/admin/packs/{pack['id']}/words", headers=admin_headers
        ).json()
        assert wid not in [w["id"] for w in remaining]

"""Tests für den Impostor-Router."""


# ---------- Helpers ----------

def _create_category(client, admin_headers, name="Testkategorie", is_active=True, sort_order=0):
    res = client.post(
        "/impostor/admin/categories",
        json={"name": name, "is_active": is_active, "sort_order": sort_order},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


def _add_words(client, admin_headers, cat_id, words):
    res = client.post(
        f"/impostor/admin/categories/{cat_id}/words",
        json={"words": words},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


# ---------- Public Endpoints ----------

class TestPublicEndpoints:
    def test_list_categories_empty(self, client):
        res = client.get("/impostor/categories")
        assert res.status_code == 200
        assert res.json() == []

    def test_list_categories_excludes_inactive(self, client, admin_headers):
        active = _create_category(client, admin_headers, name="Aktiv")
        inactive = _create_category(client, admin_headers, name="Inaktiv", is_active=False)
        _add_words(client, admin_headers, active["id"], ["Wort1"])
        _add_words(client, admin_headers, inactive["id"], ["Wort2"])

        res = client.get("/impostor/categories")
        assert res.status_code == 200
        names = [c["name"] for c in res.json()]
        assert "Aktiv" in names
        assert "Inaktiv" not in names

    def test_list_categories_excludes_empty(self, client, admin_headers):
        """Kategorien ohne Wörter dürfen nicht im Setup auftauchen."""
        with_words = _create_category(client, admin_headers, name="MitWoertern")
        _create_category(client, admin_headers, name="OhneWoerter")
        _add_words(client, admin_headers, with_words["id"], ["Foo"])

        res = client.get("/impostor/categories")
        names = [c["name"] for c in res.json()]
        assert "MitWoertern" in names
        assert "OhneWoerter" not in names

    def test_list_categories_word_count(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Count")
        _add_words(client, admin_headers, cat["id"], ["A", "B", "C"])

        res = client.get("/impostor/categories")
        data = [c for c in res.json() if c["name"] == "Count"][0]
        assert data["word_count"] == 3

    def test_list_categories_no_auth_required(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Public")
        _add_words(client, admin_headers, cat["id"], ["X"])
        # Ohne Auth-Header
        res = client.get("/impostor/categories")
        assert res.status_code == 200

    def test_random_word_returns_from_chosen_category(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="OnlyOne")
        _add_words(client, admin_headers, cat["id"], ["Hammer", "Saege"])

        res = client.post("/impostor/random", json={"category_ids": [cat["id"]]})
        assert res.status_code == 200
        data = res.json()
        assert data["category_id"] == cat["id"]
        assert data["category_name"] == "OnlyOne"
        assert data["word"] in ["Hammer", "Saege"]

    def test_random_word_no_auth_required(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Public2")
        _add_words(client, admin_headers, cat["id"], ["X"])
        res = client.post("/impostor/random", json={"category_ids": [cat["id"]]})
        assert res.status_code == 200

    def test_random_word_404_for_invalid_category(self, client):
        res = client.post("/impostor/random", json={"category_ids": [99999]})
        assert res.status_code == 404

    def test_random_word_404_for_inactive_category(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Inaktiv2", is_active=False)
        _add_words(client, admin_headers, cat["id"], ["X"])
        res = client.post("/impostor/random", json={"category_ids": [cat["id"]]})
        assert res.status_code == 404

    def test_random_word_404_when_categories_have_no_words(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Leer")
        res = client.post("/impostor/random", json={"category_ids": [cat["id"]]})
        assert res.status_code == 404

    def test_random_word_validates_payload(self, client):
        res = client.post("/impostor/random", json={"category_ids": []})
        assert res.status_code == 422


# ---------- Admin: Categories ----------

class TestAdminCategories:
    def test_list_requires_admin(self, client, auth_headers):
        res = client.get("/impostor/admin/categories", headers=auth_headers)
        assert res.status_code == 403

    def test_list_unauth(self, client):
        res = client.get("/impostor/admin/categories")
        assert res.status_code == 401

    def test_create_requires_admin(self, client, auth_headers):
        res = client.post(
            "/impostor/admin/categories",
            json={"name": "Foo"},
            headers=auth_headers,
        )
        assert res.status_code == 403

    def test_create_and_list(self, client, admin_headers):
        _create_category(client, admin_headers, name="Eins")
        _create_category(client, admin_headers, name="Zwei", is_active=False)

        res = client.get("/impostor/admin/categories", headers=admin_headers)
        assert res.status_code == 200
        names = [c["name"] for c in res.json()]
        assert "Eins" in names
        assert "Zwei" in names

    def test_create_duplicate_name_409(self, client, admin_headers):
        _create_category(client, admin_headers, name="Dup")
        res = client.post(
            "/impostor/admin/categories",
            json={"name": "Dup"},
            headers=admin_headers,
        )
        assert res.status_code == 409

    def test_create_strips_whitespace(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="  Trimmed  ")
        assert cat["name"] == "Trimmed"

    def test_create_empty_name_422(self, client, admin_headers):
        res = client.post(
            "/impostor/admin/categories",
            json={"name": "   "},
            headers=admin_headers,
        )
        assert res.status_code == 422

    def test_update_rename(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Alt")
        res = client.patch(
            f"/impostor/admin/categories/{cat['id']}",
            json={"name": "Neu"},
            headers=admin_headers,
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Neu"

    def test_update_toggle_active(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Toggle")
        res = client.patch(
            f"/impostor/admin/categories/{cat['id']}",
            json={"is_active": False},
            headers=admin_headers,
        )
        assert res.status_code == 200
        assert res.json()["is_active"] is False

    def test_update_rename_clash_409(self, client, admin_headers):
        _create_category(client, admin_headers, name="A")
        b = _create_category(client, admin_headers, name="B")
        res = client.patch(
            f"/impostor/admin/categories/{b['id']}",
            json={"name": "A"},
            headers=admin_headers,
        )
        assert res.status_code == 409

    def test_update_404(self, client, admin_headers):
        res = client.patch(
            "/impostor/admin/categories/99999",
            json={"name": "X"},
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_delete_cascades_words(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="ToDelete")
        _add_words(client, admin_headers, cat["id"], ["W1", "W2"])

        res = client.delete(
            f"/impostor/admin/categories/{cat['id']}",
            headers=admin_headers,
        )
        assert res.status_code == 204

        # Kategorie existiert nicht mehr → 404 beim Word-List
        res = client.get(
            f"/impostor/admin/categories/{cat['id']}/words",
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_delete_404(self, client, admin_headers):
        res = client.delete(
            "/impostor/admin/categories/99999",
            headers=admin_headers,
        )
        assert res.status_code == 404


# ---------- Admin: Words ----------

class TestAdminWords:
    def test_add_words_bulk(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Bulk")
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["A", "B", "C"]},
            headers=admin_headers,
        )
        assert res.status_code == 201
        assert len(res.json()) == 3

    def test_add_words_dedupes_within_payload(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Dedup")
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["A", "a", "A "]},
            headers=admin_headers,
        )
        assert res.status_code == 201
        assert len(res.json()) == 1

    def test_add_words_skips_existing(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Skip")
        _add_words(client, admin_headers, cat["id"], ["A", "B"])
        # Jetzt nochmal A + neues C
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["A", "C"]},
            headers=admin_headers,
        )
        assert res.status_code == 201
        words = [w["word"] for w in res.json()]
        assert words == ["C"]

    def test_add_words_all_existing_409(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="AllExist")
        _add_words(client, admin_headers, cat["id"], ["A"])
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["A", "a"]},
            headers=admin_headers,
        )
        assert res.status_code == 409

    def test_add_words_empty_payload_422(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Empty")
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": []},
            headers=admin_headers,
        )
        assert res.status_code == 422

    def test_add_words_only_whitespace_422(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="Whitespace")
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["  ", ""]},
            headers=admin_headers,
        )
        assert res.status_code == 422

    def test_add_words_404_for_unknown_category(self, client, admin_headers):
        res = client.post(
            "/impostor/admin/categories/99999/words",
            json={"words": ["A"]},
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_list_words(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="ListWords")
        _add_words(client, admin_headers, cat["id"], ["B", "A", "C"])
        res = client.get(
            f"/impostor/admin/categories/{cat['id']}/words",
            headers=admin_headers,
        )
        assert res.status_code == 200
        # Order ist alphabetisch (siehe Model: order_by=ImpostorWord.word)
        assert [w["word"] for w in res.json()] == ["A", "B", "C"]

    def test_delete_word(self, client, admin_headers):
        cat = _create_category(client, admin_headers, name="DelWord")
        words = _add_words(client, admin_headers, cat["id"], ["A", "B"])
        res = client.delete(
            f"/impostor/admin/words/{words[0]['id']}",
            headers=admin_headers,
        )
        assert res.status_code == 204

        res = client.get(
            f"/impostor/admin/categories/{cat['id']}/words",
            headers=admin_headers,
        )
        remaining = [w["word"] for w in res.json()]
        assert words[0]["word"] not in remaining

    def test_delete_word_404(self, client, admin_headers):
        res = client.delete(
            "/impostor/admin/words/99999",
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_words_admin_only(self, client, auth_headers, admin_headers):
        cat = _create_category(client, admin_headers, name="MemberCheck")
        res = client.post(
            f"/impostor/admin/categories/{cat['id']}/words",
            json={"words": ["X"]},
            headers=auth_headers,
        )
        assert res.status_code == 403

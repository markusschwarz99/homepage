"""Tests für scripts/hongar_content.py (Strukturprüfung + Laden)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import hongar_content as hc  # noqa: E402
import models  # noqa: E402


def _content(**page):
    return {"pages": [{"slug": "start", "title": "Start", "blocks": [{"type": "text"}], **page}]}


class TestValidate:
    def test_valid(self):
        content = _content()
        content["pages"].append({"slug": "wandern", "title": "Wandern", "parent": "start", "blocks": []})
        assert hc.validate(content) == []

    def test_missing_pages(self):
        assert hc.validate({}) != []

    def test_bad_slug_reserved_and_duplicate(self):
        errors = hc.validate({"pages": [
            {"slug": "Groß", "title": "x", "blocks": []},
            {"slug": "admin", "title": "x", "blocks": []},
            {"slug": "a", "title": "x", "blocks": []},
            {"slug": "a", "title": "x", "blocks": []},
        ]})
        assert len(errors) == 3

    def test_unknown_parent_and_block_without_type(self):
        errors = hc.validate(_content(parent="gibts-nicht", blocks=[{"title": "x"}]))
        assert len(errors) == 2


class TestLoad:
    def test_dry_run_saves_nothing(self, db_session, tmp_path):
        f = tmp_path / "c.json"
        f.write_text(json.dumps(_content()), encoding="utf-8")
        assert hc.load(db_session, f, dry_run=True) == 0
        assert db_session.query(models.SiteSetting).filter_by(key="hongar_content").first() is None

    def test_load_and_overwrite(self, db_session, tmp_path):
        f = tmp_path / "c.json"
        f.write_text(json.dumps(_content(title="Erst")), encoding="utf-8")
        assert hc.load(db_session, f, dry_run=False) == 0
        f.write_text(json.dumps(_content(title="Dann")), encoding="utf-8")
        assert hc.load(db_session, f, dry_run=False) == 0
        rows = db_session.query(models.SiteSetting).filter_by(key="hongar_content").all()
        assert len(rows) == 1
        assert json.loads(rows[0].value)["pages"][0]["title"] == "Dann"

    def test_invalid_file_rejected(self, db_session, tmp_path):
        f = tmp_path / "c.json"
        f.write_text(json.dumps({"pages": [{"slug": "x"}]}), encoding="utf-8")
        assert hc.load(db_session, f, dry_run=False) == 1
        assert db_session.query(models.SiteSetting).filter_by(key="hongar_content").first() is None

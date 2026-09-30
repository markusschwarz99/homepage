import pytest
from pydantic import ValidationError

from conftest import person
from schemas import Seed
from scripts.retreat_data import export_state, load_seed


def test_load_is_idempotent_and_keeps_tokens(db, seed):
    token = person(db, "ben-beispiel").token
    assert load_seed(db, seed) == []
    assert person(db, "ben-beispiel").token == token


def test_reload_keeps_manual_assignment(db, seed):
    ben = person(db, "ben-beispiel")
    ben.apartment_id = None
    db.commit()
    load_seed(db, seed)
    assert person(db, "ben-beispiel").apartment_id is None
    load_seed(db, seed, reset_assignments=True)
    assert person(db, "ben-beispiel").apartment.key == "101"


def test_export_roundtrip(db, seed):
    data = export_state(db)
    assert Seed.model_validate(data).people[0].token == person(db, "anna-muster").token
    assert load_seed(db, Seed.model_validate(data), reset_assignments=True) == []


def test_seed_rejects_unknown_refs(seed):
    data = seed.model_dump()
    data["people"][0]["car"] = "auto-99"
    with pytest.raises(ValidationError):
        Seed.model_validate(data)
    data = seed.model_dump()
    data["content"]["events"][0]["place"] = "nirgendwo"
    with pytest.raises(ValidationError):
        Seed.model_validate(data)


def test_event_end_after_start(seed):
    data = seed.model_dump()
    data["content"]["events"][0]["end"] = data["content"]["events"][0]["start"]
    with pytest.raises(ValidationError):
        Seed.model_validate(data)

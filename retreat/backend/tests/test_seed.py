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


def test_reload_keeps_edited_events(db, seed):
    from models import Event

    db.query(Event).first().title = "Geändert"
    db.commit()
    load_seed(db, seed)
    assert db.query(Event).filter(Event.title == "Geändert").count() == 1
    load_seed(db, seed, reset_events=True)
    assert db.query(Event).filter(Event.title == "Geändert").count() == 0
    assert db.query(Event).count() == len(seed.content.events)


def test_legacy_content_blob_migrates_events(db, seed):
    """Alt-DB: Events lagen im Content-Blob, Tabelle leer -> load übernimmt sie."""
    from models import Content, Event

    db.query(Event).delete()
    db.get(Content, 1).data = seed.content.model_dump(mode="json")
    db.commit()
    log = load_seed(db, seed)
    assert db.query(Event).count() == len(seed.content.events)
    assert "events" not in db.get(Content, 1).data
    assert "~ content" in log


def test_seed_rejects_unknown_event_people(seed):
    data = seed.model_dump()
    kajak = next(e for e in data["content"]["events"] if e["title"] == "Kajak")
    kajak["coordinator"] = "niemand"
    with pytest.raises(ValidationError):
        Seed.model_validate(data)


def test_seed_participants_alle(db, seed):
    from models import Event, Person

    strand = db.query(Event).filter(Event.title == "Strand").one()
    assert len(strand.participants) == db.query(Person).count()


def test_reset_events_clears_participants(db, seed):
    from models import event_participants

    before = db.execute(event_participants.select()).fetchall()
    load_seed(db, seed, reset_events=True)
    db.commit()
    after = db.execute(event_participants.select()).fetchall()
    assert len(after) == len(before)  # keine verwaisten Zeilen

"""Teamretreat-Daten laden, exportieren, Links ausgeben, Tokens rotieren.

Aufruf im Container (Seed liegt AUSSERHALB des Repos, ~/retreat-content/):
  python scripts/retreat_data.py load /tmp/seed.json [--reset-assignments] [--dry-run]
  python scripts/retreat_data.py export > backup.json
  python scripts/retreat_data.py links [--base https://rp.markus-schwarz.cc]
  python scripts/retreat_data.py rotate <person-key> [--dry-run]

load ist idempotent: Upsert über `key`, bestehende Tokens bleiben erhalten,
die Zuteilung aus dem Seed wird nur für neue Personen übernommen (außer mit
--reset-assignments). Ein Export lässt sich per load --reset-assignments
vollständig wiederherstellen (inkl. Tokens).
"""

import argparse
import json
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session  # noqa: E402

import models  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from schemas import Seed  # noqa: E402


def new_token() -> str:
    return secrets.token_urlsafe(24)


def _upsert(db: Session, model, key: str, values: dict, log: list[str]):
    obj = db.query(model).filter(model.key == key).first()
    if obj is None:
        obj = model(key=key, **values)
        db.add(obj)
        log.append(f"+ {model.__tablename__}: {key}")
    else:
        changed = [k for k, v in values.items() if getattr(obj, k) != v]
        for k in changed:
            setattr(obj, k, values[k])
        if changed:
            log.append(f"~ {model.__tablename__}: {key} ({', '.join(changed)})")
    return obj


def load_seed(db: Session, seed: Seed, reset_assignments: bool = False) -> list[str]:
    """Wendet den Seed an (ohne Commit) und liefert ein Änderungsprotokoll."""
    log: list[str] = []
    cars = {
        c.key: _upsert(
            db, models.Car, c.key,
            {"name": c.name, "kind": c.kind, "seats": c.seats, "sort": i}, log,
        )
        for i, c in enumerate(seed.cars)
    }
    apartments = {
        a.key: _upsert(
            db, models.Apartment, a.key,
            {
                "number": a.number, "name": a.name, "rooms_label": a.rooms_label,
                "capacity": a.capacity, "sort": i,
            },
            log,
        )
        for i, a in enumerate(seed.apartments)
    }
    db.flush()

    for i, p in enumerate(seed.people):
        person = db.query(models.Person).filter(models.Person.key == p.key).first()
        is_new = person is None
        values = {
            "first_name": p.first_name,
            "last_name": p.last_name,
            "display_name": p.display_name,
            "is_orga": p.is_orga,
            "sort": i,
        }
        if is_new:
            values["token"] = p.token or new_token()
        if is_new or reset_assignments:
            car = cars.get(p.car) if p.car else None
            values["car_id"] = car.id if car else None
            values["car_role"] = (p.car_role or "passenger") if car else None
            apt = apartments.get(p.apartment) if p.apartment else None
            values["apartment_id"] = apt.id if apt else None
        _upsert(db, models.Person, p.key, values, log)

    content = db.get(models.Content, 1)
    data = seed.content.model_dump(mode="json")
    if content is None:
        db.add(models.Content(id=1, data=data))
        log.append("+ content")
    elif content.data != data:
        content.data = data
        log.append("~ content")
    db.flush()
    return log


def export_state(db: Session) -> dict:
    content = db.get(models.Content, 1)
    return {
        "cars": [
            {"key": c.key, "name": c.name, "kind": c.kind, "seats": c.seats}
            for c in db.query(models.Car).order_by(models.Car.sort, models.Car.id)
        ],
        "apartments": [
            {
                "key": a.key, "number": a.number, "name": a.name,
                "rooms_label": a.rooms_label, "capacity": a.capacity,
            }
            for a in db.query(models.Apartment).order_by(
                models.Apartment.sort, models.Apartment.id
            )
        ],
        "people": [
            {
                "key": p.key, "first_name": p.first_name, "last_name": p.last_name,
                "display_name": p.display_name, "is_orga": p.is_orga,
                "car": p.car.key if p.car else None, "car_role": p.car_role,
                "apartment": p.apartment.key if p.apartment else None,
                "token": p.token,
            }
            for p in db.query(models.Person).order_by(models.Person.sort, models.Person.id)
        ],
        "content": content.data if content else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_load = sub.add_parser("load")
    p_load.add_argument("file")
    p_load.add_argument("--reset-assignments", action="store_true")
    p_load.add_argument("--dry-run", action="store_true")
    sub.add_parser("export")
    p_links = sub.add_parser("links")
    p_links.add_argument("--base", default="https://rp.markus-schwarz.cc")
    p_rotate = sub.add_parser("rotate")
    p_rotate.add_argument("key")
    p_rotate.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if args.cmd == "load":
            seed = Seed.model_validate_json(Path(args.file).read_text())
            log = load_seed(db, seed, reset_assignments=args.reset_assignments)
            print("\n".join(log) or "Keine Änderungen.")
            if args.dry_run:
                db.rollback()
                print("(dry-run, nichts gespeichert)")
            else:
                db.commit()
        elif args.cmd == "export":
            json.dump(export_state(db), sys.stdout, ensure_ascii=False, indent=2)
            print()
        elif args.cmd == "links":
            for p in db.query(models.Person).order_by(models.Person.sort, models.Person.id):
                name = f"{p.display_name or p.first_name} {p.last_name}"
                print(f"{name}: {args.base.rstrip('/')}/?k={p.token}")
        elif args.cmd == "rotate":
            person = db.query(models.Person).filter(models.Person.key == args.key).first()
            if person is None:
                raise SystemExit(f"Unbekannte Person: {args.key}")
            person.token = new_token()
            if args.dry_run:
                db.rollback()
                print("(dry-run, nichts gespeichert)")
            else:
                db.commit()
                print(f"Neuer Token für {args.key}: {person.token}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

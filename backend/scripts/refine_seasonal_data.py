"""
Seasonal Calendar: korrekte Verfügbarkeitsdaten für Österreich/Mitteleuropa.

Ersetzt die Verfügbarkeiten der bestehenden seasonal_items mit handgepflegten
Werten basierend auf österreichischen Saisonkalendern (AMA, Land schafft Leben).

Format pro Item: {month_int: [type, ...]} mit type ∈ {"regional", "storage"}
- "regional" = heimisch frisch geerntet/verfügbar
- "storage" = heimisch aus Lagerung
- Monate ohne Eintrag = nicht verfügbar (z.B. weil nur Importware)

Heuristik:
- Frische Saison: nur regional
- Lagerware-Klassiker: regional in Erntezeit + storage über Winter
- Frischgemüse (Tomate, Paprika, Zucchini etc.): nur regional in Saison
- Beeren/Steinobst: nur regional in Saison

Aufruf (im Backend-Container):
  python scripts/refine_seasonal_data.py [--dry-run]

Idempotent: kann mehrfach laufen, ersetzt jeweils komplett.
"""

import argparse
import sys
from pathlib import Path

# Damit der Container-Import-Pfad passt: /app im sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from database import engine  # noqa: E402
import models  # noqa: E402

# Type-Aliases für Lesbarkeit
R = "regional"
L = "storage"

# ---------- Datendefinition ----------
# Pro Item: dict[Monat 1..12] -> Liste von Verfügbarkeitstypen
# Monate ohne Eintrag = nicht verfügbar

# fmt: off
ITEMS: dict[str, dict[int, list[str]]] = {
    # ===== OBST =====
    "Apfel": {
        1: [L], 2: [L], 3: [L], 4: [L], 8: [R], 9: [R], 10: [R, L], 11: [L], 12: [L]
    },
    "Birne": {
        1: [L], 2: [L], 8: [R], 9: [R], 10: [R, L], 11: [L], 12: [L]
    },
    "Erdbeere": {
        5: [R], 6: [R], 7: [R]
    },
    "Himbeere": {
        6: [R], 7: [R], 8: [R], 9: [R]
    },
    "Brombeere": {
        7: [R], 8: [R], 9: [R]
    },
    "Heidelbeere": {
        7: [R], 8: [R], 9: [R]
    },
    "Johannisbeere": {
        6: [R], 7: [R], 8: [R]
    },
    "Stachelbeere": {
        6: [R], 7: [R], 8: [R]
    },
    "Kirsche": {
        6: [R], 7: [R], 8: [R]
    },
    "Marille": {
        6: [R], 7: [R], 8: [R]
    },
    "Pfirsich": {
        7: [R], 8: [R], 9: [R]
    },
    "Nektarine": {
        7: [R], 8: [R], 9: [R]
    },
    "Pflaume": {
        7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Zwetschge": {
        8: [R], 9: [R], 10: [R]
    },
    "Weintraube": {
        8: [R], 9: [R], 10: [R], 11: [R]
    },
    "Rhabarber": {
        4: [R], 5: [R], 6: [R]
    },
    "Quitte": {
        9: [R], 10: [R], 11: [R]
    },
    "Holunderbeere": {
        8: [R], 9: [R]
    },

    # ===== GEMÜSE =====
    "Kartoffel": {
        1: [L], 2: [L], 3: [L], 4: [L], 5: [L],
        6: [R, L], 7: [R], 8: [R], 9: [R], 10: [R, L],
        11: [L], 12: [L]
    },
    "Karotte": {
        1: [L], 2: [L], 3: [L], 4: [L], 6: [R], 7: [R], 8: [R], 9: [R, L], 10: [R, L],
        11: [L], 12: [L]
    },
    "Zwiebel": {
        1: [L], 2: [L], 3: [L], 4: [L], 5: [L],
        7: [R], 8: [R], 9: [R, L], 10: [R, L],
        11: [L], 12: [L]
    },
    "Knoblauch": {
        1: [L], 2: [L], 7: [R], 8: [R, L], 9: [L], 10: [L], 11: [L], 12: [L]
    },
    "Lauch": {
        1: [R], 2: [R], 3: [R], 4: [R],
        9: [R], 10: [R], 11: [R], 12: [R]
    },
    "Rote Rübe": {
        1: [L], 2: [L], 3: [L],
        6: [R], 7: [R], 8: [R], 9: [R, L], 10: [R, L],
        11: [L], 12: [L]
    },
    "Sellerie": {
        1: [L], 2: [L], 3: [L],
        8: [R], 9: [R, L], 10: [R, L], 11: [L], 12: [L]
    },
    "Pastinake": {
        1: [L], 2: [L], 3: [L],
        10: [R, L], 11: [L], 12: [L]
    },
    "Kürbis": {
        1: [L],
        8: [R], 9: [R], 10: [R, L], 11: [L], 12: [L]
    },
    "Spinat": {
        3: [R], 4: [R], 5: [R],
        9: [R], 10: [R], 11: [R]
    },
    "Mangold": {
        5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Salat": {
        4: [R], 5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Vogerlsalat": {
        1: [R], 2: [R], 3: [R],
        10: [R], 11: [R], 12: [R]
    },
    "Chicorée": {
        1: [R], 2: [R], 3: [R], 4: [R],
        10: [R], 11: [R], 12: [R]
    },
    "Radicchio": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R], 11: [R], 12: [R]
    },
    "Rucola": {
        4: [R], 5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Tomate": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Gurke": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Paprika": {
        7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Zucchini": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Aubergine": {
        7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Brokkoli": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Karfiol": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R], 11: [R]
    },
    "Kohlrabi": {
        5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Weißkraut": {
        1: [L], 2: [L], 3: [L],
        6: [R], 7: [R], 8: [R], 9: [R, L], 10: [R, L],
        11: [L], 12: [L]
    },
    "Rotkraut": {
        1: [L], 2: [L], 3: [L],
        9: [R], 10: [R, L], 11: [L], 12: [L]
    },
    "Wirsing": {
        1: [L], 2: [L], 3: [L],
        6: [R], 7: [R], 8: [R], 9: [R, L], 10: [R, L],
        11: [L], 12: [L]
    },
    "Grünkohl": {
        11: [R], 12: [R], 1: [R], 2: [R]
    },
    "Kohlsprossen": {
        10: [R], 11: [R], 12: [R], 1: [R], 2: [R], 3: [R]
    },
    "Erbse": {
        6: [R], 7: [R], 8: [R]
    },
    "Bohne": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Spargel": {
        4: [R], 5: [R], 6: [R]
    },
    "Radieschen": {
        4: [R], 5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R]
    },
    "Rettich": {
        5: [R], 6: [R], 7: [R], 8: [R], 9: [R], 10: [R], 11: [R]
    },
    "Bärlauch": {
        3: [R], 4: [R], 5: [R]
    },
    "Schwarzwurzel": {
        1: [L], 2: [L], 3: [L], 4: [L],
        10: [R, L], 11: [L], 12: [L]
    },
    "Topinambur": {
        1: [L], 2: [L], 3: [L], 4: [L],
        10: [R, L], 11: [L], 12: [L]
    },
    "Fenchel": {
        6: [R], 7: [R], 8: [R], 9: [R], 10: [R], 11: [R]
    }
}
# fmt: on


def _validate_data() -> list[str]:
    """Sanity check der ITEMS-Struktur. Gibt eine Liste an Fehlermeldungen zurück."""
    errors: list[str] = []
    valid_types = {R, L}
    for name, months in ITEMS.items():
        if not months:
            errors.append(f"{name}: keine Monate definiert")
            continue
        for m, types in months.items():
            if not (1 <= m <= 12):
                errors.append(f"{name}: Monat {m} außerhalb 1..12")
            if not types:
                errors.append(f"{name}: Monat {m} hat leere Type-Liste")
            for t in types:
                if t not in valid_types:
                    errors.append(f"{name}: Monat {m} hat unbekannten Type '{t}'")
            if len(types) != len(set(types)):
                errors.append(f"{name}: Monat {m} hat Duplikate: {types}")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Zeigt Änderungen, schreibt aber nicht in die DB",
    )
    args = parser.parse_args()

    # 1) Validierung der hinterlegten Daten
    errors = _validate_data()
    if errors:
        print("FEHLER in den Skript-Daten:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print(f"Skript enthält {len(ITEMS)} Items.")
    if args.dry_run:
        print("DRY-RUN: keine Änderungen werden geschrieben.\n")

    # 2) DB-Session
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Alle Items aus DB
        db_items = db.query(models.SeasonalItem).all()
        db_by_name_lower = {i.name.lower(): i for i in db_items}

        skript_names_lower = {n.lower() for n in ITEMS.keys()}

        # 3) Items im Skript, die nicht in DB sind
        missing_in_db = [n for n in ITEMS.keys() if n.lower() not in db_by_name_lower]
        if missing_in_db:
            print("Items im Skript, aber nicht in DB (übersprungen):")
            for n in missing_in_db:
                print(f"  - {n}")
            print()

        # 4) Items in DB, die nicht im Skript sind (zur Info — werden nicht angetastet)
        extra_in_db = [i.name for i in db_items if i.name.lower() not in skript_names_lower]
        if extra_in_db:
            print("Items in DB, aber nicht im Skript (bleiben unverändert):")
            for n in extra_in_db:
                print(f"  - {n}")
            print()

        # 5) Updates durchführen
        updated = 0
        for name, months_data in ITEMS.items():
            item = db_by_name_lower.get(name.lower())
            if not item:
                continue

            # Komplett neue availabilities aufbauen
            new_entries = []
            for month, types in months_data.items():
                for t in types:
                    # Postgres-Enum erwartet die value-Strings (regional/storage)
                    new_entries.append((month, t))

            if args.dry_run:
                old = sorted(
                    {(a.month, a.type.value) for a in item.availabilities}
                )
                new = sorted(set(new_entries))
                if old != new:
                    print(f"[DRY] {item.name}:")
                    print(f"      alt: {len(old)} Einträge")
                    print(f"      neu: {len(new)} Einträge")
                    updated += 1
            else:
                # Alte Einträge clearen, neue hinzufügen
                item.availabilities.clear()
                db.flush()
                # Type-String → Enum-Member auflösen via _value2member_map_
                avail_enum = models.SeasonalAvailability
                for month, type_str in new_entries:
                    enum_member = avail_enum(type_str)  # value-Lookup
                    item.availabilities.append(
                        models.SeasonalAvailabilityEntry(month=month, type=enum_member)
                    )
                updated += 1
                print(f"  ✓ {item.name}: {len(new_entries)} Einträge")

        if not args.dry_run:
            db.commit()
            print(f"\n{updated} Items aktualisiert. Commit erfolgreich.")
        else:
            print(f"\nDRY-RUN: {updated} Items würden aktualisiert.")

    finally:
        db.close()


if __name__ == "__main__":
    main()

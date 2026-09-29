"""
Seiteninhalte der hongar-Website laden oder exportieren.

Die Texte der fest gestalteten Seiten liegen als JSON im site_settings-Key
"hongar_content" – bewusst NICHT im öffentlichen Repo. Die JSON-Datei
liegt außerhalb des Repos (z.B. ~/hongar-content/content.json auf dem Pi)
und wird per docker cp in den Container geholt.

Aufbau: {"pages": [{"slug", "title", "parent"?, "nav"?, "hero"?, "blocks": [...]}]}
Die Block-Typen sind in hongar/src/lib/content.ts beschrieben.

Aufruf im Backend-Container:
  python scripts/hongar_content.py load /tmp/content.json --dry-run
  python scripts/hongar_content.py load /tmp/content.json
  python scripts/hongar_content.py export > /tmp/content.json
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Damit der Container-Import-Pfad passt: /app im sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from database import engine  # noqa: E402
import models  # noqa: E402

KEY = "hongar_content"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# Feste Frontend-Routen, die keine Inhaltsseite überdecken darf.
RESERVED_SLUGS = {"admin", "webcam"}


def validate(content) -> list[str]:
    """Grobe Strukturprüfung – Details der Blöcke prüft das Frontend-Typing."""
    errors = []
    pages = content.get("pages") if isinstance(content, dict) else None
    if not isinstance(pages, list):
        return ['Oberste Ebene braucht eine Liste "pages"']
    slugs = set()
    for i, page in enumerate(pages):
        where = f"pages[{i}]"
        if not isinstance(page, dict):
            errors.append(f"{where}: kein Objekt")
            continue
        slug = page.get("slug")
        if not isinstance(slug, str) or not SLUG_RE.match(slug):
            errors.append(f"{where}: ungültiger slug {slug!r}")
        elif slug in RESERVED_SLUGS:
            errors.append(f"{where}: slug {slug!r} ist reserviert")
        elif slug in slugs:
            errors.append(f"{where}: slug {slug!r} doppelt")
        slugs.add(slug)
        if not isinstance(page.get("title"), str) or not page["title"].strip():
            errors.append(f"{where}: title fehlt")
        blocks = page.get("blocks")
        if not isinstance(blocks, list):
            errors.append(f"{where}: blocks muss eine Liste sein")
        else:
            for j, block in enumerate(blocks):
                if not isinstance(block, dict) or not isinstance(block.get("type"), str):
                    errors.append(f"{where}.blocks[{j}]: type fehlt")
    for i, page in enumerate(pages):
        parent = page.get("parent") if isinstance(page, dict) else None
        if parent is not None and parent not in slugs:
            errors.append(f"pages[{i}]: parent {parent!r} existiert nicht")
    return errors


def load(db, path: Path, dry_run: bool) -> int:
    content = json.loads(path.read_text(encoding="utf-8"))
    errors = validate(content)
    if errors:
        for e in errors:
            print(f"FEHLER: {e}", file=sys.stderr)
        return 1
    for page in content["pages"]:
        print(f"  /{page['slug']:<24} {page['title']}  ({len(page['blocks'])} Blöcke)")
    if dry_run:
        print("Dry-run – nichts gespeichert.")
        return 0
    value = json.dumps(content, ensure_ascii=False)
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == KEY).first()
    if row:
        row.value = value
    else:
        db.add(models.SiteSetting(key=KEY, value=value))
    db.commit()
    print(f"{len(content['pages'])} Seiten gespeichert.")
    return 0


def export(db) -> int:
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == KEY).first()
    print(json.dumps(json.loads(row.value) if row else {"pages": []}, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_load = sub.add_parser("load", help="JSON-Datei prüfen und speichern")
    p_load.add_argument("file", type=Path)
    p_load.add_argument("--dry-run", action="store_true")
    sub.add_parser("export", help="gespeicherte Inhalte als JSON ausgeben")
    args = parser.parse_args()

    db = sessionmaker(bind=engine)()
    try:
        if args.cmd == "load":
            return load(db, args.file, args.dry_run)
        return export(db)
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())

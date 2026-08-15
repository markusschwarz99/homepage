"""add codewort theme packs (Österreich, IT & Technik, Sport & Spiel)

Revision ID: a7b8c9d0e1f2
Revises: cd1e2f3a4b5c
Create Date: 2026-08-15 19:00:00.000000

Seed: drei zusätzliche Themen-Wortpakete. Duplikate innerhalb eines Pakets
werden vor dem Insert entfernt (dict.fromkeys behält die Reihenfolge).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'cd1e2f3a4b5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (name, sort_order, words). sort_order > 0, damit das Basispaket vorne bleibt.
THEME_PACKS: list[tuple[str, int, list[str]]] = [
    ("Österreich", 1, [
        "Sachertorte", "Kaiserschmarrn", "Apfelstrudel", "Knödel", "Schnitzel",
        "Germknödel", "Marille", "Topfen", "Semmel", "Kipferl",
        "Palatschinke", "Almdudler", "Mozartkugel", "Lederhose", "Dirndl",
        "Tracht", "Edelweiß", "Enzian", "Alm", "Gletscher",
        "Skilift", "Piste", "Rodel", "Lawine", "Wasserfall",
        "Heuriger", "Most", "Fiaker", "Riesenrad", "Prater",
        "Stephansdom", "Oper", "Walzer", "Lipizzaner", "Haflinger",
        "Steinbock", "Murmeltier", "Krampus", "Perchten", "Maibaum",
        "Zither", "Gams", "Almhütte", "Seilbahn", "Donau",
        "Wörthersee", "Großglockner",
    ]),
    ("IT & Technik", 2, [
        "Maus", "Tastatur", "Bildschirm", "Server", "Cloud",
        "Kabel", "Router", "Chip", "Festplatte", "Passwort",
        "Virus", "Datei", "Ordner", "Pixel", "Akku",
        "Drucker", "Scanner", "Code", "Netzwerk", "Browser",
        "Suchmaschine", "Roboter", "Drohne", "Satellit", "Laser",
        "Antenne", "Platine", "Lüfter", "Bluetooth", "Kamera",
        "Mikrofon", "Lautsprecher", "Kopfhörer", "Grafikkarte", "Prozessor",
        "Speicher", "Steckdose", "Ladegerät", "Tablet", "Smartphone",
        "Konsole", "Joystick", "Webcam", "Modem", "Speicherkarte",
    ]),
    ("Sport & Spiel", 3, [
        "Fußball", "Tennis", "Basketball", "Handball", "Volleyball",
        "Tor", "Netz", "Schläger", "Ball", "Puck",
        "Eishockey", "Schwimmen", "Tauchen", "Surfen", "Segeln",
        "Rudern", "Klettern", "Boxen", "Ringen", "Fechten",
        "Judo", "Karate", "Turnen", "Barren", "Trampolin",
        "Marathon", "Sprint", "Hürde", "Speer", "Diskus",
        "Weitsprung", "Hochsprung", "Ski", "Snowboard", "Schlitten",
        "Schlittschuh", "Rennrad", "Helm", "Trikot", "Pfeife",
        "Medaille", "Pokal", "Stadion", "Schach", "Dart",
        "Bowling", "Billard",
    ]),
]


def upgrade() -> None:
    pack_table = sa.table(
        "codewort_packs",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    word_table = sa.table(
        "codewort_words",
        sa.column("pack_id", sa.Integer),
        sa.column("word", sa.String),
    )

    bind = op.get_bind()
    for name, sort_order, words in THEME_PACKS:
        pack_id = bind.execute(
            sa.insert(pack_table)
            .values(name=name, is_active=True, sort_order=sort_order)
            .returning(pack_table.c.id)
        ).scalar_one()
        unique_words = list(dict.fromkeys(words))
        bind.execute(
            sa.insert(word_table),
            [{"pack_id": pack_id, "word": w} for w in unique_words],
        )


def downgrade() -> None:
    bind = op.get_bind()
    names = tuple(name for name, _, _ in THEME_PACKS)
    bind.execute(
        sa.text("DELETE FROM codewort_packs WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": list(names)},
    )

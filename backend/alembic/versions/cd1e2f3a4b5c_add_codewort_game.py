"""add codewort game tables and seed base pack

Revision ID: cd1e2f3a4b5c
Revises: e2f3a4b5c6d7
Create Date: 2026-08-15 12:00:00.000000

Schema:
- codewort_packs (id, name index, is_active, sort_order, created_at)
- codewort_words (id, pack_id FK cascade, word, created_at,
                  UNIQUE(pack_id, word))

Seed: ein deutsches Basispaket mit >= 300 konkreten, mehrdeutigen Substantiven.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd1e2f3a4b5c'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BASE_PACK_NAME = "Basis (Deutsch)"

# Konkrete, allgemein bekannte Substantive, moeglichst mehrdeutig. Keine
# Eigennamen von Personen, keine Beleidigungen. Duplikate werden vor dem
# Insert entfernt (dict.fromkeys behaelt die Reihenfolge).
BASE_WORDS: list[str] = [
    # Natur & Wetter
    "Sonne", "Mond", "Stern", "Wolke", "Regen", "Schnee", "Blitz", "Donner",
    "Sturm", "Nebel", "Eis", "Feuer", "Wasser", "Erde", "Luft", "Berg",
    "Tal", "Fluss", "See", "Meer", "Wald", "Wüste", "Insel", "Strand",
    "Höhle", "Vulkan", "Baum", "Blume", "Gras", "Wurzel", "Blatt", "Ast",
    "Stein", "Sand", "Welle", "Regenbogen",
    # Tiere
    "Hund", "Katze", "Pferd", "Kuh", "Schwein", "Schaf", "Ziege", "Huhn",
    "Ente", "Gans", "Maus", "Ratte", "Hase", "Fuchs", "Wolf", "Bär",
    "Löwe", "Tiger", "Elefant", "Affe", "Schlange", "Frosch", "Fisch", "Hai",
    "Wal", "Delfin", "Krebs", "Spinne", "Biene", "Ameise", "Fliege", "Vogel",
    "Adler", "Eule", "Taube", "Pinguin", "Igel", "Fledermaus", "Schnecke",
    "Wurm",
    # Körper
    "Kopf", "Auge", "Ohr", "Nase", "Mund", "Zahn", "Zunge", "Hals",
    "Arm", "Hand", "Finger", "Bein", "Fuß", "Knie", "Herz", "Haut",
    "Haar", "Rücken", "Bauch", "Knochen",
    # Haus & Wohnen
    "Tisch", "Stuhl", "Bett", "Schrank", "Tür", "Fenster", "Dach", "Wand",
    "Boden", "Treppe", "Keller", "Küche", "Bad", "Lampe", "Kerze", "Spiegel",
    "Uhr", "Schlüssel", "Schloss", "Teppich", "Kissen", "Decke", "Vorhang",
    "Ofen", "Bild",
    # Essen & Küche
    "Brot", "Butter", "Käse", "Ei", "Salz", "Zucker", "Pfeffer", "Öl",
    "Milch", "Mehl", "Suppe", "Kuchen", "Apfel", "Birne", "Banane", "Kirsche",
    "Traube", "Zitrone", "Nuss", "Honig", "Marmelade", "Schokolade", "Kaffee",
    "Tee", "Wein", "Bier", "Teller", "Tasse", "Glas", "Gabel", "Messer",
    "Löffel", "Topf", "Pfanne", "Flasche", "Pilz", "Bohne",
    # Werkzeug & Technik
    "Hammer", "Nagel", "Säge", "Schraube", "Zange", "Bohrer", "Leiter",
    "Pinsel", "Farbe", "Kabel", "Draht", "Batterie", "Motor", "Rad", "Kette",
    "Feder", "Magnet", "Glühbirne", "Computer", "Telefon", "Kamera", "Roboter",
    "Waage",
    # Verkehr
    "Auto", "Bus", "Zug", "Schiff", "Boot", "Flugzeug", "Rakete", "Fahrrad",
    "Motorrad", "Anker", "Segel", "Brücke", "Straße", "Ampel", "Tunnel",
    "Bahnhof", "Hafen", "Flügel", "Reifen", "Ruder",
    # Kleidung
    "Hemd", "Hose", "Rock", "Kleid", "Jacke", "Mantel", "Schuh", "Stiefel",
    "Socke", "Hut", "Mütze", "Schal", "Handschuh", "Gürtel", "Knopf", "Tasche",
    "Krawatte", "Brille", "Ring", "Krone",
    # Rollen & Berufe
    "Arzt", "Lehrer", "Koch", "Bauer", "Richter", "König", "Königin", "Ritter",
    "Pirat", "Clown", "Engel", "Riese", "Zwerg", "Hexe", "Geist", "Held",
    "Dieb", "Wache", "Jäger", "Kapitän", "Zauberer", "Roboter",
    # Orte & Gebäude
    "Schule", "Kirche", "Burg", "Turm", "Mühle", "Fabrik", "Markt", "Bank",
    "Museum", "Theater", "Kino", "Zirkus", "Zoo", "Park", "Garten", "Feld",
    "Bauernhof", "Krankenhaus", "Palast", "Leuchtturm",
    # Objekte & Abstraktes (gut fürs Assoziieren)
    "Zeit", "Licht", "Schatten", "Traum", "Musik", "Note", "Ton", "Punkt",
    "Linie", "Kreis", "Kugel", "Würfel", "Zahl", "Buchstabe", "Wort", "Brief",
    "Buch", "Zeitung", "Karte", "Bombe", "Pistole", "Schwert", "Schild",
    "Pfeil", "Bogen", "Netz", "Falle", "Maske", "Schatz", "Gold", "Diamant",
    "Perle", "Münze", "Geld",
    # Spiel & Freizeit
    "Ball", "Puzzle", "Puppe", "Drache", "Schaukel", "Rutsche", "Trommel",
    "Gitarre", "Klavier", "Flöte", "Bühne", "Zelt", "Feuerwerk", "Kompass",
    "Fernrohr", "Angel", "Schach", "Würfelbecher",
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "codewort_packs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_codewort_packs_id", "codewort_packs", ["id"])
    op.create_index("ix_codewort_packs_name", "codewort_packs", ["name"])

    op.create_table(
        "codewort_words",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pack_id", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["pack_id"],
            ["codewort_packs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pack_id", "word", name="uq_codewort_word_per_pack"),
    )
    op.create_index("ix_codewort_words_id", "codewort_words", ["id"])
    op.create_index("ix_codewort_words_pack_id", "codewort_words", ["pack_id"])

    # ---- Seed: Basispaket ----
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
    result = bind.execute(
        sa.insert(pack_table)
        .values(name=BASE_PACK_NAME, is_active=True, sort_order=0)
        .returning(pack_table.c.id)
    )
    pack_id = result.scalar_one()

    unique_words = list(dict.fromkeys(BASE_WORDS))
    bind.execute(
        sa.insert(word_table),
        [{"pack_id": pack_id, "word": w} for w in unique_words],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_codewort_words_pack_id", table_name="codewort_words")
    op.drop_index("ix_codewort_words_id", table_name="codewort_words")
    op.drop_table("codewort_words")
    op.drop_index("ix_codewort_packs_name", table_name="codewort_packs")
    op.drop_index("ix_codewort_packs_id", table_name="codewort_packs")
    op.drop_table("codewort_packs")

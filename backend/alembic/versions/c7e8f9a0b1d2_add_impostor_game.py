"""add impostor game tables and seed data

Revision ID: c7e8f9a0b1d2
Revises: f1a2b3c4d5e6
Create Date: 2026-05-02 12:00:00.000000

Schema:
- impostor_categories (id, name unique, is_active, sort_order, created_at)
- impostor_words      (id, category_id FK cascade, word, created_at,
                       UNIQUE(category_id, word))

Seed: 20 Kategorien × 30 Wörter = 600 Wörter.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e8f9a0b1d2'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SEED_DATA: list[tuple[str, list[str]]] = [
    ("Essen", [
        "Pizza", "Spaghetti", "Wiener Schnitzel", "Sushi", "Hamburger",
        "Lasagne", "Kaiserschmarrn", "Gulasch", "Apfelstrudel", "Tafelspitz",
        "Käsespätzle", "Pommes frites", "Tiramisu", "Sachertorte", "Donut",
        "Croissant", "Brezel", "Knödel", "Risotto", "Currywurst",
        "Falafel", "Pad Thai", "Tacos", "Pancakes", "Bratwurst",
        "Caesar Salad", "Ramen", "Pho", "Paella", "Ratatouille",
    ]),
    ("Tiere", [
        "Elefant", "Löwe", "Pinguin", "Giraffe", "Känguru",
        "Delfin", "Adler", "Schildkröte", "Krokodil", "Eichhörnchen",
        "Igel", "Fuchs", "Wolf", "Bär", "Hai",
        "Oktopus", "Schmetterling", "Biene", "Ameise", "Spinne",
        "Pferd", "Kuh", "Schaf", "Ziege", "Hase",
        "Papagei", "Eule", "Flamingo", "Faultier", "Panda",
    ]),
    ("Berufe", [
        "Arzt", "Lehrer", "Polizist", "Feuerwehrmann", "Pilot",
        "Koch", "Bäcker", "Metzger", "Tischler", "Friseur",
        "Anwalt", "Architekt", "Journalist", "Programmierer", "Krankenpfleger",
        "Bauer", "Briefträger", "Müllmann", "Maurer", "Elektriker",
        "Klempner", "Mechaniker", "Schauspieler", "Sänger", "Künstler",
        "Astronaut", "Bibliothekar", "Übersetzer", "Zahnarzt", "Tierarzt",
    ]),
    ("Orte/Länder", [
        "Österreich", "Deutschland", "Italien", "Frankreich", "Spanien",
        "Japan", "Brasilien", "Australien", "Kanada", "Ägypten",
        "Indien", "Mexiko", "Norwegen", "Griechenland", "Türkei",
        "Schweiz", "Portugal", "Niederlande", "Schweden", "Polen",
        "Wien", "Paris", "Tokio", "New York", "London",
        "Rom", "Berlin", "Sydney", "Reykjavík", "Kapstadt",
    ]),
    ("Filme/Serien", [
        "Star Wars", "Harry Potter", "Der Pate", "Titanic", "Avatar",
        "Inception", "Matrix", "Forrest Gump", "Jurassic Park", "Pulp Fiction",
        "Breaking Bad", "Game of Thrones", "Stranger Things", "Friends", "The Office",
        "Dark", "The Crown", "House of Cards", "Sherlock", "Lost",
        "Der König der Löwen", "Findet Nemo", "Toy Story", "Shrek", "Frozen",
        "Indiana Jones", "James Bond", "Rocky", "Top Gun", "Gladiator",
    ]),
    ("Sport", [
        "Fußball", "Tennis", "Basketball", "Skifahren", "Schwimmen",
        "Volleyball", "Handball", "Eishockey", "Baseball", "Golf",
        "Boxen", "Judo", "Reiten", "Klettern", "Surfen",
        "Snowboarden", "Rudern", "Marathon", "Hochsprung", "Speerwurf",
        "Yoga", "Pilates", "Tischtennis", "Badminton", "Squash",
        "Curling", "Bogenschießen", "Fechten", "Rugby", "Bowling",
    ]),
    ("Musikinstrumente", [
        "Klavier", "Gitarre", "Geige", "Schlagzeug", "Saxophon",
        "Trompete", "Flöte", "Harfe", "Cello", "Klarinette",
        "Akkordeon", "Mundharmonika", "Bass", "Banjo", "Mandoline",
        "Posaune", "Tuba", "Triangel", "Gong", "Xylophon",
        "Marimba", "Dudelsack", "Synthesizer", "Bratsche", "Kontrabass",
        "Ukulele", "Pauke", "Tamburin", "Maracas", "Cajón",
    ]),
    ("Fahrzeuge", [
        "Auto", "Fahrrad", "Motorrad", "Bus", "Zug",
        "Flugzeug", "Schiff", "U-Boot", "Hubschrauber", "Traktor",
        "LKW", "Roller", "Skateboard", "Inlineskates", "Segelboot",
        "Kanu", "Kajak", "Heißluftballon", "Rakete", "Straßenbahn",
        "U-Bahn", "Lokomotive", "Pferdekutsche", "Schlitten", "Schneemobil",
        "Quad", "Bagger", "Müllwagen", "Krankenwagen", "Taxi",
    ]),
    ("Werkzeuge", [
        "Hammer", "Schraubenzieher", "Säge", "Bohrmaschine", "Zange",
        "Schraubenschlüssel", "Wasserwaage", "Maßband", "Schaufel", "Spaten",
        "Rechen", "Hacke", "Schubkarre", "Leiter", "Pinsel",
        "Rolle", "Spachtel", "Cuttermesser", "Schere", "Klebepistole",
        "Akkuschrauber", "Stichsäge", "Kreissäge", "Hobel", "Feile",
        "Meißel", "Schraubstock", "Lötkolben", "Multimeter", "Taschenlampe",
    ]),
    ("Kleidung", [
        "T-Shirt", "Hose", "Pullover", "Jacke", "Mantel",
        "Kleid", "Rock", "Schal", "Mütze", "Handschuhe",
        "Socken", "Schuhe", "Stiefel", "Sandalen", "Hemd",
        "Krawatte", "Anzug", "Bademantel", "Pyjama", "Bikini",
        "Badehose", "Jeans", "Trainingsanzug", "Hut", "Cap",
        "Gürtel", "Tasche", "Rucksack", "Geldbörse", "Sonnenbrille",
    ]),
    ("Möbel", [
        "Tisch", "Stuhl", "Sofa", "Bett", "Schrank",
        "Regal", "Kommode", "Sessel", "Hocker", "Bank",
        "Schreibtisch", "Couchtisch", "Esstisch", "Kleiderschrank", "Bücherregal",
        "Nachttisch", "Spiegel", "Garderobe", "Vitrine", "Sideboard",
        "Schaukelstuhl", "Liegestuhl", "Hängematte", "Kinderbett", "Hochstuhl",
        "Etagenbett", "Sekretär", "Truhe", "Couch", "Bartisch",
    ]),
    ("Obst", [
        "Apfel", "Banane", "Orange", "Erdbeere", "Kirsche",
        "Birne", "Zitrone", "Wassermelone", "Ananas", "Mango",
        "Kiwi", "Pfirsich", "Aprikose", "Pflaume", "Traube",
        "Himbeere", "Heidelbeere", "Brombeere", "Granatapfel", "Feige",
        "Dattel", "Kokosnuss", "Papaya", "Maracuja", "Litschi",
        "Mandarine", "Grapefruit", "Stachelbeere", "Quitte", "Kaki",
    ]),
    ("Gemüse", [
        "Karotte", "Tomate", "Gurke", "Salat", "Paprika",
        "Zwiebel", "Knoblauch", "Kartoffel", "Brokkoli", "Karfiol",
        "Spinat", "Kürbis", "Zucchini", "Aubergine", "Mais",
        "Erbsen", "Bohnen", "Lauch", "Sellerie", "Rote Bete",
        "Radieschen", "Rettich", "Pastinake", "Spargel", "Artischocke",
        "Fenchel", "Mangold", "Rucola", "Chinakohl", "Süßkartoffel",
    ]),
    ("Getränke", [
        "Wasser", "Kaffee", "Tee", "Milch", "Bier",
        "Wein", "Sekt", "Cola", "Limonade", "Saft",
        "Smoothie", "Cocktail", "Whisky", "Wodka", "Gin",
        "Rum", "Tequila", "Champagner", "Cidre", "Likör",
        "Espresso", "Cappuccino", "Latte Macchiato", "Heiße Schokolade", "Eistee",
        "Energy Drink", "Mineralwasser", "Apfelsaft", "Orangensaft", "Mezcal",
    ]),
    ("Körperteile", [
        "Kopf", "Arm", "Bein", "Hand", "Fuß",
        "Auge", "Ohr", "Nase", "Mund", "Zahn",
        "Finger", "Zehe", "Knie", "Ellbogen", "Schulter",
        "Rücken", "Bauch", "Brust", "Hals", "Kinn",
        "Stirn", "Wange", "Lippe", "Zunge", "Hüfte",
        "Knöchel", "Handgelenk", "Augenbraue", "Wimper", "Nacken",
    ]),
    ("Haushaltsgeräte", [
        "Kühlschrank", "Waschmaschine", "Geschirrspüler", "Mikrowelle", "Backofen",
        "Herd", "Toaster", "Kaffeemaschine", "Wasserkocher", "Mixer",
        "Staubsauger", "Bügeleisen", "Fernseher", "Föhn", "Rasierer",
        "Trockner", "Klimaanlage", "Ventilator", "Heizung", "Thermomix",
        "Stabmixer", "Eismaschine", "Brotbackautomat", "Reiskocher", "Friteuse",
        "Dampfreiniger", "Heizdecke", "Luftbefeuchter", "Wäscheständer", "Nähmaschine",
    ]),
    ("Wetter & Natur", [
        "Regen", "Schnee", "Sonne", "Wolke", "Blitz",
        "Donner", "Sturm", "Hagel", "Nebel", "Regenbogen",
        "Berg", "Tal", "Fluss", "See", "Meer",
        "Wald", "Wüste", "Insel", "Vulkan", "Wasserfall",
        "Gletscher", "Höhle", "Strand", "Klippe", "Sumpf",
        "Lawine", "Erdbeben", "Tornado", "Tsunami", "Hurrikan",
    ]),
    ("Schule & Büro", [
        "Stift", "Bleistift", "Radiergummi", "Lineal", "Heft",
        "Buch", "Tafel", "Kreide", "Spitzer", "Schultasche",
        "Mäppchen", "Filzstift", "Textmarker", "Klebstoff", "Tacker",
        "Locher", "Ordner", "Briefumschlag", "Notizbuch", "Taschenrechner",
        "Computer", "Drucker", "Scanner", "Whiteboard", "Beamer",
        "Pinnwand", "Kalender", "Globus", "Atlas", "Lehrbuch",
    ]),
    ("Spielzeug & Spiele", [
        "Lego", "Puppe", "Teddybär", "Puzzle", "Brettspiel",
        "Schach", "Würfel", "Skateboard", "Trampolin", "Kreisel",
        "Yo-Yo", "Wasserpistole", "Drachen", "Bauklötze", "Murmeln",
        "Karten", "Memory", "Monopoly", "Scrabble", "Mensch ärgere dich nicht",
        "Frisbee", "Roller", "Hüpfball", "Zauberwürfel", "Modelleisenbahn",
        "Spielfigur", "Springseil", "Federball", "Sandkasten", "Schaukel",
    ]),
    ("Märchen & Fantasie", [
        "Drache", "Einhorn", "Hexe", "Zauberer", "Prinzessin",
        "Ritter", "Vampir", "Werwolf", "Zombie", "Geist",
        "Elf", "Zwerg", "Troll", "Riese", "Fee",
        "Meerjungfrau", "Phönix", "Greif", "Zentaur", "Kobold",
        "Yeti", "Goblin", "Magier", "Orakel", "Pegasus",
        "Sphinx", "Basilisk", "Minotaurus", "Frosch König", "Schneewittchen",
    ]),
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "impostor_categories",
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
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        "ix_impostor_categories_name",
        "impostor_categories",
        ["name"],
        unique=True,
    )
    op.create_index(
        "ix_impostor_categories_id",
        "impostor_categories",
        ["id"],
    )

    op.create_table(
        "impostor_words",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["impostor_categories.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_id", "word", name="uq_impostor_word_per_category"),
    )
    op.create_index(
        "ix_impostor_words_id",
        "impostor_words",
        ["id"],
    )
    op.create_index(
        "ix_impostor_words_category_id",
        "impostor_words",
        ["category_id"],
    )

    # ---- Seed-Daten ----
    cat_table = sa.table(
        "impostor_categories",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    word_table = sa.table(
        "impostor_words",
        sa.column("category_id", sa.Integer),
        sa.column("word", sa.String),
    )

    bind = op.get_bind()

    for sort_idx, (cat_name, words) in enumerate(SEED_DATA):
        result = bind.execute(
            sa.insert(cat_table)
            .values(name=cat_name, is_active=True, sort_order=sort_idx)
            .returning(cat_table.c.id)
        )
        cat_id = result.scalar_one()
        bind.execute(
            sa.insert(word_table),
            [{"category_id": cat_id, "word": w} for w in words],
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_impostor_words_category_id", table_name="impostor_words")
    op.drop_index("ix_impostor_words_id", table_name="impostor_words")
    op.drop_table("impostor_words")
    op.drop_index("ix_impostor_categories_id", table_name="impostor_categories")
    op.drop_index("ix_impostor_categories_name", table_name="impostor_categories")
    op.drop_table("impostor_categories")

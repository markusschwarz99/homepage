"""add seasonal_items

Revision ID: e511624ef4ca
Revises: b5e06c314352
Create Date: 2026-04-26 15:25:14.403188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e511624ef4ca'
down_revision: Union[str, Sequence[str], None] = 'b5e06c314352'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------- Seed-Daten ----------
# ~50 Sorten für Mitteleuropa (D/A), orientiert an gängigen Saisonkalendern.
# months = Monate mit regionaler Hauptverfügbarkeit; availability gibt an,
# ob das Item überwiegend frisch regional, aus Lager oder per Import angeboten wird.

SEED_ITEMS = [
    # ----- Obst -----
    {"name": "Apfel", "category": "fruit", "months": [8, 9, 10, 11, 12, 1, 2, 3, 4],
     "availability": "storage", "notes": "Heimisches Kernobst, ganzjährig aus Lager"},
    {"name": "Birne", "category": "fruit", "months": [8, 9, 10, 11, 12, 1, 2],
     "availability": "storage", "notes": "Hauptsaison Spätsommer/Herbst"},
    {"name": "Erdbeere", "category": "fruit", "months": [5, 6, 7],
     "availability": "regional", "notes": "Kurze Hauptsaison Mai bis Juli"},
    {"name": "Himbeere", "category": "fruit", "months": [6, 7, 8, 9],
     "availability": "regional", "notes": None},
    {"name": "Brombeere", "category": "fruit", "months": [7, 8, 9],
     "availability": "regional", "notes": None},
    {"name": "Heidelbeere", "category": "fruit", "months": [7, 8, 9],
     "availability": "regional", "notes": None},
    {"name": "Johannisbeere", "category": "fruit", "months": [6, 7, 8],
     "availability": "regional", "notes": None},
    {"name": "Stachelbeere", "category": "fruit", "months": [6, 7, 8],
     "availability": "regional", "notes": None},
    {"name": "Kirsche", "category": "fruit", "months": [6, 7, 8],
     "availability": "regional", "notes": "Süß- und Sauerkirschen"},
    {"name": "Marille", "category": "fruit", "months": [6, 7, 8],
     "availability": "regional", "notes": "Wachauer Marille als Spezialität"},
    {"name": "Pfirsich", "category": "fruit", "months": [7, 8, 9],
     "availability": "regional", "notes": None},
    {"name": "Nektarine", "category": "fruit", "months": [7, 8, 9],
     "availability": "regional", "notes": None},
    {"name": "Pflaume", "category": "fruit", "months": [7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Zwetschge", "category": "fruit", "months": [8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Weintraube", "category": "fruit", "months": [8, 9, 10, 11],
     "availability": "regional", "notes": None},
    {"name": "Rhabarber", "category": "fruit", "months": [4, 5, 6],
     "availability": "regional", "notes": "Botanisch Gemüse, kulinarisch Obst"},
    {"name": "Quitte", "category": "fruit", "months": [9, 10, 11],
     "availability": "regional", "notes": None},
    {"name": "Holunderbeere", "category": "fruit", "months": [8, 9],
     "availability": "regional", "notes": None},

    # ----- Gemüse -----
    {"name": "Kartoffel", "category": "vegetable", "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
     "availability": "storage", "notes": "Frühkartoffeln ab Juni, Lager ganzjährig"},
    {"name": "Karotte", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": "Bundkarotten ab Juni, Lager bis Frühjahr"},
    {"name": "Zwiebel", "category": "vegetable", "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
     "availability": "storage", "notes": "Lagerware ganzjährig"},
    {"name": "Knoblauch", "category": "vegetable", "months": [7, 8, 9, 10, 11, 12, 1, 2],
     "availability": "storage", "notes": None},
    {"name": "Lauch", "category": "vegetable", "months": [1, 2, 3, 4, 9, 10, 11, 12],
     "availability": "regional", "notes": "Winterlauch besonders aromatisch"},
    {"name": "Rote Rübe", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": "Auch Rote Bete genannt"},
    {"name": "Sellerie", "category": "vegetable", "months": [8, 9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": "Knollen- und Stangensellerie"},
    {"name": "Pastinake", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": None},
    {"name": "Kürbis", "category": "vegetable", "months": [8, 9, 10, 11, 12, 1],
     "availability": "storage", "notes": "Hokkaido und Butternut sehr beliebt"},
    {"name": "Spinat", "category": "vegetable", "months": [3, 4, 5, 9, 10, 11],
     "availability": "regional", "notes": None},
    {"name": "Mangold", "category": "vegetable", "months": [5, 6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Salat", "category": "vegetable", "months": [4, 5, 6, 7, 8, 9, 10],
     "availability": "regional", "notes": "Kopf-, Eichblatt-, Lollo etc."},
    {"name": "Vogerlsalat", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3],
     "availability": "regional", "notes": "Auch Feldsalat"},
    {"name": "Chicorée", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3, 4],
     "availability": "regional", "notes": None},
    {"name": "Radicchio", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11, 12],
     "availability": "regional", "notes": None},
    {"name": "Rucola", "category": "vegetable", "months": [4, 5, 6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Tomate", "category": "vegetable", "months": [6, 7, 8, 9, 10],
     "availability": "regional", "notes": "Freilandtomaten in Hauptsaison"},
    {"name": "Gurke", "category": "vegetable", "months": [6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Paprika", "category": "vegetable", "months": [7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Zucchini", "category": "vegetable", "months": [6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Aubergine", "category": "vegetable", "months": [7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Brokkoli", "category": "vegetable", "months": [6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Karfiol", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11],
     "availability": "regional", "notes": "Auch Blumenkohl"},
    {"name": "Kohlrabi", "category": "vegetable", "months": [5, 6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Weißkraut", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": None},
    {"name": "Rotkraut", "category": "vegetable", "months": [9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": None},
    {"name": "Wirsing", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
     "availability": "storage", "notes": None},
    {"name": "Grünkohl", "category": "vegetable", "months": [11, 12, 1, 2],
     "availability": "regional", "notes": "Nach erstem Frost am besten"},
    {"name": "Kohlsprossen", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3],
     "availability": "regional", "notes": "Auch Rosenkohl"},
    {"name": "Erbse", "category": "vegetable", "months": [6, 7, 8],
     "availability": "regional", "notes": None},
    {"name": "Bohne", "category": "vegetable", "months": [6, 7, 8, 9, 10],
     "availability": "regional", "notes": "Grüne Bohnen, Käferbohnen etc."},
    {"name": "Spargel", "category": "vegetable", "months": [4, 5, 6],
     "availability": "regional", "notes": "Bis 24. Juni (Johannitag)"},
    {"name": "Radieschen", "category": "vegetable", "months": [4, 5, 6, 7, 8, 9, 10],
     "availability": "regional", "notes": None},
    {"name": "Rettich", "category": "vegetable", "months": [5, 6, 7, 8, 9, 10, 11],
     "availability": "regional", "notes": None},
    {"name": "Bärlauch", "category": "vegetable", "months": [3, 4, 5],
     "availability": "regional", "notes": "Wildkraut, sehr kurze Saison"},
    {"name": "Schwarzwurzel", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3, 4],
     "availability": "storage", "notes": None},
    {"name": "Topinambur", "category": "vegetable", "months": [10, 11, 12, 1, 2, 3, 4],
     "availability": "storage", "notes": None},
    {"name": "Fenchel", "category": "vegetable", "months": [6, 7, 8, 9, 10, 11],
     "availability": "regional", "notes": None},
]


def upgrade() -> None:
    """Upgrade schema."""
    # Tabelle anlegen
    # WICHTIG: Enum-Values beachten – 'import' (ohne Underscore) ist der korrekte Wert.
    op.create_table(
        'seasonal_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column(
            'category',
            sa.Enum('fruit', 'vegetable', name='seasonal_category'),
            nullable=False,
        ),
        sa.Column(
            'months',
            postgresql.ARRAY(sa.Integer()),
            server_default='{}',
            nullable=False,
        ),
        sa.Column(
            'availability',
            sa.Enum('regional', 'storage', 'import', name='seasonal_availability'),
            server_default='regional',
            nullable=False,
        ),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_seasonal_items_category'),
        'seasonal_items',
        ['category'],
        unique=False,
    )
    op.create_index(
        op.f('ix_seasonal_items_id'),
        'seasonal_items',
        ['id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_seasonal_items_name'),
        'seasonal_items',
        ['name'],
        unique=True,
    )

    # Seed-Daten einfügen
    seasonal_items_table = sa.table(
        'seasonal_items',
        sa.column('name', sa.String),
        sa.column('category', sa.String),
        sa.column('months', postgresql.ARRAY(sa.Integer())),
        sa.column('availability', sa.String),
        sa.column('notes', sa.Text),
    )
    op.bulk_insert(seasonal_items_table, SEED_ITEMS)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_seasonal_items_name'), table_name='seasonal_items')
    op.drop_index(op.f('ix_seasonal_items_id'), table_name='seasonal_items')
    op.drop_index(op.f('ix_seasonal_items_category'), table_name='seasonal_items')
    op.drop_table('seasonal_items')
    # Postgres-Enums explizit droppen, sonst bleiben sie im Schema hängen
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS seasonal_category')
        op.execute('DROP TYPE IF EXISTS seasonal_availability')

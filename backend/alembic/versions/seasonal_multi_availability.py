"""seasonal_items: multi-availability via junction table

Revision ID: f1a2b3c4d5e6
Revises: a4c5274d72e4
Create Date: 2026-04-28 18:30:00.000000

Strukturänderung:
- Bisher: seasonal_items.months (int[]) + seasonal_items.availability (single enum)
- Neu:    seasonal_availabilities (item_id, month, type) als Junction Table

Daten werden 1:1 migriert: jede (item, month)-Kombination bekommt den
bisherigen availability-Wert als type. Verlustfrei, aber inhaltlich noch
nicht "korrekter" — feinere Daten kommen über ein separates Seed-Skript.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'a4c5274d72e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()

    # Der Enum-Type 'seasonal_availability' existiert bereits in Postgres
    # (von der ursprünglichen Migration). Wir referenzieren ihn ohne create_type=True,
    # damit der Type NICHT neu erstellt wird.
    availability_enum = postgresql.ENUM(
        'regional', 'storage', 'import',
        name='seasonal_availability',
        create_type=False,
    )

    # 1) Neue Junction-Tabelle anlegen
    op.create_table(
        'seasonal_availabilities',
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('type', availability_enum, nullable=False),
        sa.ForeignKeyConstraint(
            ['item_id'], ['seasonal_items.id'],
            ondelete='CASCADE',
            name='fk_seasonal_avail_item',
        ),
        sa.PrimaryKeyConstraint('item_id', 'month', 'type', name='pk_seasonal_availabilities'),
        sa.CheckConstraint('month >= 1 AND month <= 12', name='ck_seasonal_avail_month_range'),
    )
    op.create_index('ix_seasonal_avail_month', 'seasonal_availabilities', ['month'])
    op.create_index('ix_seasonal_avail_type', 'seasonal_availabilities', ['type'])

    # 2) Daten migrieren: für jede Zeile in seasonal_items einen Eintrag
    # pro Monat in seasonal_availabilities mit dem bestehenden availability-Wert.
    # Auf frischer DB ist das ein No-Op (E2E-safe).
    if bind.dialect.name == 'postgresql':
        op.execute(
            """
            INSERT INTO seasonal_availabilities (item_id, month, type)
            SELECT id, unnest(months), availability
            FROM seasonal_items
            WHERE array_length(months, 1) IS NOT NULL
            """
        )
    else:
        # SQLite-Pfad (für lokales Testing wenn jemand alembic gegen SQLite laufen lässt)
        # Production geht ausschließlich Postgres-Pfad.
        result = bind.execute(sa.text("SELECT id, months, availability FROM seasonal_items"))
        for row in result:
            months = row.months or []
            for m in months:
                bind.execute(
                    sa.text(
                        "INSERT INTO seasonal_availabilities (item_id, month, type) "
                        "VALUES (:iid, :m, :t)"
                    ),
                    {"iid": row.id, "m": m, "t": row.availability},
                )

    # 3) Alte Spalten droppen
    op.drop_column('seasonal_items', 'months')
    op.drop_column('seasonal_items', 'availability')


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()

    availability_enum = postgresql.ENUM(
        'regional', 'storage', 'import',
        name='seasonal_availability',
        create_type=False,
    )

    # 1) Alte Spalten wiederherstellen
    op.add_column(
        'seasonal_items',
        sa.Column(
            'months',
            postgresql.ARRAY(sa.Integer()) if bind.dialect.name == 'postgresql' else sa.JSON(),
            server_default='{}' if bind.dialect.name == 'postgresql' else None,
            nullable=False,
        ),
    )
    op.add_column(
        'seasonal_items',
        sa.Column(
            'availability',
            availability_enum,
            server_default='regional',
            nullable=False,
        ),
    )

    # 2) Daten zurückspielen
    # months: distinct Monate pro Item
    # availability: "beste" Verfügbarkeit pro Item — Priorität regional > storage > import
    if bind.dialect.name == 'postgresql':
        op.execute(
            """
            UPDATE seasonal_items si
            SET months = COALESCE(sub.months, ARRAY[]::int[])
            FROM (
                SELECT item_id, ARRAY_AGG(DISTINCT month ORDER BY month) AS months
                FROM seasonal_availabilities
                GROUP BY item_id
            ) sub
            WHERE si.id = sub.item_id
            """
        )
        op.execute(
            """
            UPDATE seasonal_items si
            SET availability = sub.best_type::seasonal_availability
            FROM (
                SELECT item_id,
                    CASE
                        WHEN bool_or(type = 'regional') THEN 'regional'
                        WHEN bool_or(type = 'storage') THEN 'storage'
                        ELSE 'import'
                    END AS best_type
                FROM seasonal_availabilities
                GROUP BY item_id
            ) sub
            WHERE si.id = sub.item_id
            """
        )
    else:
        # SQLite-Pfad (analog, Python-seitig)
        items = bind.execute(sa.text("SELECT DISTINCT item_id FROM seasonal_availabilities")).fetchall()
        for (iid,) in items:
            rows = bind.execute(
                sa.text("SELECT month, type FROM seasonal_availabilities WHERE item_id = :iid"),
                {"iid": iid},
            ).fetchall()
            months = sorted({r.month for r in rows})
            types = {r.type for r in rows}
            if 'regional' in types:
                best = 'regional'
            elif 'storage' in types:
                best = 'storage'
            else:
                best = 'import'
            bind.execute(
                sa.text("UPDATE seasonal_items SET months = :m, availability = :a WHERE id = :iid"),
                {"m": months, "a": best, "iid": iid},
            )

    # 3) Junction-Tabelle droppen
    op.drop_index('ix_seasonal_avail_type', table_name='seasonal_availabilities')
    op.drop_index('ix_seasonal_avail_month', table_name='seasonal_availabilities')
    op.drop_table('seasonal_availabilities')

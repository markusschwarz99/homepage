"""remove_import_from_seasonal_availability

Entfernt den Wert "import" aus dem Postgres-Enum seasonal_availability.

Vorgehen:
1. Alle SeasonalAvailabilityEntry-Rows mit type='import' loeschen.
2. Neuen Enum-Type seasonal_availability_new mit nur (regional, storage) anlegen.
3. Spalte seasonal_availabilities.type auf neuen Type casten.
4. Alten Type droppen, neuen Type umbenennen.

Hinweis: Die geloeschten Rows koennen beim Downgrade NICHT wiederhergestellt
werden. Ein Downgrade fuegt nur den Enum-Wert "import" wieder hinzu, die Daten
selbst sind weg.

Revision ID: 35a7d963d996
Revises: 981139483fef
Create Date: 2026-05-03

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "35a7d963d996"
down_revision: Union[str, None] = "981139483fef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Daten mit Wert "import" entfernen.
    op.execute("DELETE FROM seasonal_availabilities WHERE type = 'import'")

    # 2) Neuen Enum-Type ohne "import" anlegen.
    op.execute("CREATE TYPE seasonal_availability_new AS ENUM ('regional', 'storage')")

    # 3) Spalte auf neuen Type casten (Text-Roundtrip).
    op.execute(
        "ALTER TABLE seasonal_availabilities "
        "ALTER COLUMN type TYPE seasonal_availability_new "
        "USING type::text::seasonal_availability_new"
    )

    # 4) Alten Type droppen, neuen umbenennen.
    op.execute("DROP TYPE seasonal_availability")
    op.execute("ALTER TYPE seasonal_availability_new RENAME TO seasonal_availability")


def downgrade() -> None:
    # Enum wieder um "import" erweitern. Geloeschte Rows sind unwiederbringlich.
    op.execute(
        "CREATE TYPE seasonal_availability_old "
        "AS ENUM ('regional', 'storage', 'import')"
    )
    op.execute(
        "ALTER TABLE seasonal_availabilities "
        "ALTER COLUMN type TYPE seasonal_availability_old "
        "USING type::text::seasonal_availability_old"
    )
    op.execute("DROP TYPE seasonal_availability")
    op.execute("ALTER TYPE seasonal_availability_old RENAME TO seasonal_availability")

"""add group_name to recipe_ingredients

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-08-23 12:00:00.000000

Optionale Zutaten-Gruppe (z.B. "Dressing"). Nullable, keine Backfill nötig.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipe_ingredients",
        sa.Column("group_name", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recipe_ingredients", "group_name")

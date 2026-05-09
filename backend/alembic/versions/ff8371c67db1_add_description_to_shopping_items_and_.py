"""add description to shopping items and history

Revision ID: ff8371c67db1
Revises: 99063ae60fa4
Create Date: 2026-05-09 19:36:59.881946

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff8371c67db1'
down_revision: Union[str, Sequence[str], None] = '99063ae60fa4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('shopping_items', sa.Column('description', sa.String(), nullable=True))
    op.add_column('purchase_history', sa.Column('description', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('purchase_history', 'description')
    op.drop_column('shopping_items', 'description')

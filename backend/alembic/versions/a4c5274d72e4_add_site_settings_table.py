"""add site_settings table

Revision ID: a4c5274d72e4
Revises: e511624ef4ca
Create Date: 2026-04-27 15:43:49.125516

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4c5274d72e4'
down_revision: Union[str, Sequence[str], None] = 'e511624ef4ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'site_settings',
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', sa.Text(), nullable=False, server_default=''),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('key'),
    )
    op.create_index(
        op.f('ix_site_settings_key'),
        'site_settings',
        ['key'],
        unique=False,
    )

    # Seed: aktueller Homepage-Intro-Text
    op.execute(
        sa.text(
            "INSERT INTO site_settings (key, value) "
            "VALUES (:key, :value)"
        ).bindparams(
            key='homepage_intro',
            value='Hier teile ich meine Gedanken, Rezepte und Ideen. Schön dass du da bist!',
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_site_settings_key'), table_name='site_settings')
    op.drop_table('site_settings')

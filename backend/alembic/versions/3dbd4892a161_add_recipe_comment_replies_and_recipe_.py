"""add recipe_comment_replies and recipe_comment_reply notification

Revision ID: 3dbd4892a161
Revises: ff8371c67db1
Create Date: 2026-05-10 05:55:32.490525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3dbd4892a161'
down_revision: Union[str, Sequence[str], None] = 'ff8371c67db1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Self-referential FK for nested-style replies (currently used flat: 1 level).
    op.add_column(
        'recipe_comments',
        sa.Column('parent_id', sa.Integer(), nullable=True),
    )
    op.create_index(
        op.f('ix_recipe_comments_parent_id'),
        'recipe_comments',
        ['parent_id'],
        unique=False,
    )
    op.create_foreign_key(
        'recipe_comments_parent_id_fkey',
        'recipe_comments',
        'recipe_comments',
        ['parent_id'],
        ['id'],
        ondelete='CASCADE',
    )
    # Alembic autogenerate does NOT detect Postgres enum value additions, so do it manually.
    # IF NOT EXISTS makes the migration idempotent (Postgres 12+).
    op.execute(
        "ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'recipe_comment_reply'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'recipe_comments_parent_id_fkey',
        'recipe_comments',
        type_='foreignkey',
    )
    op.drop_index(
        op.f('ix_recipe_comments_parent_id'),
        table_name='recipe_comments',
    )
    op.drop_column('recipe_comments', 'parent_id')
    # Note: Postgres does not support DROP VALUE on enums without recreating the type.
    # The 'recipe_comment_reply' value remains on downgrade — harmless if no rows use it.

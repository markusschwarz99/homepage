"""remove photo diary tables

Revision ID: e2f3a4b5c6d7
Revises: c9d0e1f2a3b4
Create Date: 2026-08-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop photo diary tables (Foto-Tagebuch entfernt)."""
    op.drop_index(op.f('ix_photo_diary_images_id'), table_name='photo_diary_images')
    op.drop_index(op.f('ix_photo_diary_images_entry_id'), table_name='photo_diary_images')
    op.drop_table('photo_diary_images')
    op.drop_index(op.f('ix_photo_diary_entries_id'), table_name='photo_diary_entries')
    op.drop_index(op.f('ix_photo_diary_entries_entry_date'), table_name='photo_diary_entries')
    op.drop_table('photo_diary_entries')


def downgrade() -> None:
    """Recreate photo diary tables."""
    op.create_table(
        'photo_diary_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('entry_time', sa.Time(), server_default=sa.text('CURRENT_TIME'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_photo_diary_entries_entry_date'), 'photo_diary_entries', ['entry_date'], unique=False)
    op.create_index(op.f('ix_photo_diary_entries_id'), 'photo_diary_entries', ['id'], unique=False)

    op.create_table(
        'photo_diary_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('thumb_url', sa.String(), nullable=False),
        sa.Column('caption', sa.String(length=500), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['photo_diary_entries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_photo_diary_images_entry_id'), 'photo_diary_images', ['entry_id'], unique=False)
    op.create_index(op.f('ix_photo_diary_images_id'), 'photo_diary_images', ['id'], unique=False)

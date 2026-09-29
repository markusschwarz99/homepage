"""hongar: Veranstaltungen statt CMS-Seiten

Die Seiten der hongar-Website sind jetzt fest gestaltet (Texte als JSON im
site_settings-Key hongar_content); bearbeitbar bleiben nur Aktuelles,
Öffnungszeiten & Co. sowie die Veranstaltungen.

Revision ID: afcfd66ad95b
Revises: d4537c2be1e2
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'afcfd66ad95b'
down_revision: Union[str, Sequence[str], None] = 'd4537c2be1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('hongar_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('event_date', sa.Date(), nullable=False),
    sa.Column('time_label', sa.String(length=50), server_default='', nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), server_default='', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hongar_events_id'), 'hongar_events', ['id'], unique=False)
    op.create_index(op.f('ix_hongar_events_event_date'), 'hongar_events', ['event_date'], unique=False)

    op.drop_index(op.f('ix_hongar_page_images_page_id'), table_name='hongar_page_images')
    op.drop_index(op.f('ix_hongar_page_images_id'), table_name='hongar_page_images')
    op.drop_table('hongar_page_images')
    op.drop_index(op.f('ix_hongar_pages_parent_id'), table_name='hongar_pages')
    op.drop_index(op.f('ix_hongar_pages_id'), table_name='hongar_pages')
    op.drop_table('hongar_pages')


def downgrade() -> None:
    """Downgrade schema (Seiten-Tabellen kommen leer zurück)."""
    op.create_table('hongar_pages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('position', sa.Integer(), server_default='0', nullable=False),
    sa.Column('content_html', sa.Text(), server_default='', nullable=False),
    sa.Column('cover_image', sa.String(), nullable=True),
    sa.Column('is_published', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('show_in_nav', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['parent_id'], ['hongar_pages.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug', name='uq_hongar_pages_slug')
    )
    op.create_index(op.f('ix_hongar_pages_id'), 'hongar_pages', ['id'], unique=False)
    op.create_index(op.f('ix_hongar_pages_parent_id'), 'hongar_pages', ['parent_id'], unique=False)
    op.create_table('hongar_page_images',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('page_id', sa.Integer(), nullable=False),
    sa.Column('filename', sa.String(), nullable=False),
    sa.Column('caption', sa.String(length=300), server_default='', nullable=False),
    sa.Column('position', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['page_id'], ['hongar_pages.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hongar_page_images_id'), 'hongar_page_images', ['id'], unique=False)
    op.create_index(op.f('ix_hongar_page_images_page_id'), 'hongar_page_images', ['page_id'], unique=False)

    op.drop_index(op.f('ix_hongar_events_event_date'), table_name='hongar_events')
    op.drop_index(op.f('ix_hongar_events_id'), table_name='hongar_events')
    op.drop_table('hongar_events')

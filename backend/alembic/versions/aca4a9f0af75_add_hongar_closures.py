"""hongar: Betriebsurlaub (hongar_closures)

Revision ID: aca4a9f0af75
Revises: afcfd66ad95b
Create Date: 2026-09-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aca4a9f0af75'
down_revision: Union[str, Sequence[str], None] = 'afcfd66ad95b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('hongar_closures',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('note', sa.String(length=300), server_default='', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hongar_closures_id'), 'hongar_closures', ['id'], unique=False)
    op.create_index(op.f('ix_hongar_closures_end_date'), 'hongar_closures', ['end_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_hongar_closures_end_date'), table_name='hongar_closures')
    op.drop_index(op.f('ix_hongar_closures_id'), table_name='hongar_closures')
    op.drop_table('hongar_closures')

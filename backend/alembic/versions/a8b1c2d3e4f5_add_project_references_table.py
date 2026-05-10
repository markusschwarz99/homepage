"""add project_references table

Revision ID: a8b1c2d3e4f5
Revises: f1a2b3c4d5e6
Create Date: 2026-05-10 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a8b1c2d3e4f5'
down_revision: Union[str, Sequence[str], None] = '3dbd4892a161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_references',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('date_from', sa.Date(), nullable=False),
        sa.Column('date_to', sa.Date(), nullable=True),
        sa.Column('industry', sa.String(length=200), nullable=False),
        sa.Column('contact', sa.String(length=200), nullable=False),
        sa.Column('fte', sa.Float(), nullable=False),
        sa.Column('topic', sa.Text(), nullable=False),
        sa.Column('roles', sa.Text(), nullable=False),
        sa.Column('responsibilities', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_project_references_id', 'project_references', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_project_references_id', table_name='project_references')
    op.drop_table('project_references')

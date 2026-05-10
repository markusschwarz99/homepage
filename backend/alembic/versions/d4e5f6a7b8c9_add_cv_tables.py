"""add cv tables

Revision ID: d4e5f6a7b8c9
Revises: a8b1c2d3e4f5
Create Date: 2026-05-10

"""
from typing import Union, Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'a8b1c2d3e4f5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'cv_profile',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vorname', sa.String(100), nullable=True),
        sa.Column('nachname', sa.String(100), nullable=True),
        sa.Column('geburtsdatum', sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_profile_id', 'cv_profile', ['id'])

    op.create_table(
        'cv_experiences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date_from', sa.Date(), nullable=False),
        sa.Column('date_to', sa.Date(), nullable=True),
        sa.Column('rolle', sa.String(200), nullable=False),
        sa.Column('beschreibung', sa.Text(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_experiences_id', 'cv_experiences', ['id'])

    op.create_table(
        'cv_languages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sprache', sa.String(100), nullable=False),
        sa.Column('niveau', sa.String(100), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_languages_id', 'cv_languages', ['id'])

    op.create_table(
        'cv_certificates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('jahr', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_certificates_id', 'cv_certificates', ['id'])

    op.create_table(
        'cv_educations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date_from', sa.Date(), nullable=False),
        sa.Column('date_to', sa.Date(), nullable=True),
        sa.Column('beschreibung', sa.Text(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_educations_id', 'cv_educations', ['id'])


def downgrade() -> None:
    op.drop_index('ix_cv_educations_id', table_name='cv_educations')
    op.drop_table('cv_educations')
    op.drop_index('ix_cv_certificates_id', table_name='cv_certificates')
    op.drop_table('cv_certificates')
    op.drop_index('ix_cv_languages_id', table_name='cv_languages')
    op.drop_table('cv_languages')
    op.drop_index('ix_cv_experiences_id', table_name='cv_experiences')
    op.drop_table('cv_experiences')
    op.drop_index('ix_cv_profile_id', table_name='cv_profile')
    op.drop_table('cv_profile')

"""remove blog feature and clean up impostor unique constraint

Removes the blog feature entirely:
- drops `comments` table (had FK on blog_posts, never wired up to a router)
- drops `blog_posts` table

Also fixes constraint drift on impostor_categories:
- drops redundant `impostor_categories_name_key` UNIQUE CONSTRAINT
  (came from `unique=True` on the column; the explicit
  `ix_impostor_categories_name` UNIQUE INDEX from `index=True` already
  enforces uniqueness, so the constraint was duplicate work)

Refs: closes #27

Revision ID: adae80cc7b19
Revises: 1face0b29154
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "adae80cc7b19"
down_revision = "1face0b29154"
branch_labels = None
depends_on = None


def upgrade():
    # 1) comments first (FK -> blog_posts)
    op.drop_index("ix_comments_id", table_name="comments")
    op.drop_table("comments")

    # 2) blog_posts
    op.drop_index("ix_blog_posts_id", table_name="blog_posts")
    op.drop_table("blog_posts")

    # 3) Redundant unique constraint on impostor_categories.name
    op.drop_constraint(
        "impostor_categories_name_key",
        "impostor_categories",
        type_="unique",
    )


def downgrade():
    # Re-add unique constraint
    op.create_unique_constraint(
        "impostor_categories_name_key",
        "impostor_categories",
        ["name"],
    )

    # Re-create blog_posts with original initial-schema shape
    op.create_table(
        "blog_posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blog_posts_id", "blog_posts", ["id"], unique=False)

    # Re-create comments with original initial-schema shape
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("post_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["post_id"], ["blog_posts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_id", "comments", ["id"], unique=False)

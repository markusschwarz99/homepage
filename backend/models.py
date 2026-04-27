from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="guest")  # guest, member, admin
    avatar_url = Column(String, default="")
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    @property
    def is_admin(self):
        return self.role == "admin"

    @property
    def is_household(self):
        return self.role in ("household", "admin")

    @property
    def is_member(self):
        return self.role in ("member", "household", "admin")

class BlogPost(Base):
    __tablename__ = "blog_posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    author = relationship("User")
    comments = relationship("Comment", back_populates="post", cascade="all, delete")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("blog_posts.id"))
    created_at = Column(DateTime, default=func.now())
    author = relationship("User")
    post = relationship("BlogPost", back_populates="comments")

class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    quantity = Column(String, default="1")
    added_by_id = Column(Integer, ForeignKey("users.id"))
    added_at = Column(DateTime, default=func.now())
    added_by = relationship("User")

class PurchaseHistory(Base):
    __tablename__ = "purchase_history"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False, index=True)
    quantity = Column(String, default="1")
    purchased = Column(Boolean, default=True)
    purchased_at = Column(DateTime, default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))


# ==================== Rezepte & Tags ====================

class TagCategory(Base):
    __tablename__ = "tag_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now())
    tags = relationship(
        "Tag",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Tag.position",
    )

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("tag_categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now())
    category = relationship("TagCategory", back_populates="tags")
    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_tag_category_name"),)

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    servings = Column(Integer, default=4, nullable=False)
    servings_unit = Column(String, default="Portionen", nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    author = relationship("User")
    ingredients = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.position",
    )
    steps = relationship(
        "RecipeStep",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.position",
    )
    images = relationship(
        "RecipeImage",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeImage.position",
    )
    tags = relationship("Tag", secondary="recipe_tags")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    amount = Column(Float, nullable=True)
    unit = Column(String, default="", nullable=False)
    name = Column(String, nullable=False)
    recipe = relationship("Recipe", back_populates="ingredients")

class RecipeStep(Base):
    __tablename__ = "recipe_steps"
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    recipe = relationship("Recipe", back_populates="steps")

class RecipeImage(Base):
    __tablename__ = "recipe_images"
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    url = Column(String, nullable=False)
    recipe = relationship("Recipe", back_populates="images")

class RecipeTag(Base):
    __tablename__ = "recipe_tags"
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


# ============================================================
# Saisonkalender (Obst & Gemüse)
# ============================================================

import enum as _enum_seasonal
from sqlalchemy import Enum as _SAEnum_seasonal
from db_types import IntArray as _IntArray_seasonal


class SeasonalCategory(str, _enum_seasonal.Enum):
    fruit = "fruit"
    vegetable = "vegetable"


class SeasonalAvailability(str, _enum_seasonal.Enum):
    regional = "regional"
    storage = "storage"
    import_ = "import"


class SeasonalItem(Base):
    __tablename__ = "seasonal_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(
        _SAEnum_seasonal(SeasonalCategory, name="seasonal_category"),
        nullable=False,
        index=True,
    )
    months = Column(_IntArray_seasonal(), nullable=False, default=list)
    availability = Column(
        _SAEnum_seasonal(SeasonalAvailability, name="seasonal_availability"),
        nullable=False,
        default=SeasonalAvailability.regional,
        server_default="regional",
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ============================================================
# Site Settings (Key/Value)
# ============================================================

class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=False, default="")
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

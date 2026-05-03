from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, Text, ForeignKey, Float, UniqueConstraint, CheckConstraint, Index
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


class SeasonalItem(Base):
    __tablename__ = "seasonal_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(
        _SAEnum_seasonal(SeasonalCategory, name="seasonal_category", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    availabilities = relationship(
        "SeasonalAvailabilityEntry",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="SeasonalAvailabilityEntry.month",
    )


class SeasonalAvailabilityEntry(Base):
    """
    Verfügbarkeits-Eintrag pro (Item, Monat, Typ).
    Composite-PK: ein Item kann pro Monat mehrere Typen haben (z.B. regional + storage).
    """

    __tablename__ = "seasonal_availabilities"

    item_id = Column(
        Integer,
        ForeignKey("seasonal_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    month = Column(Integer, primary_key=True)
    type = Column(
        _SAEnum_seasonal(SeasonalAvailability, name="seasonal_availability", values_callable=lambda e: [m.value for m in e]),
        primary_key=True,
    )

    item = relationship("SeasonalItem", back_populates="availabilities")

    __table_args__ = (
        CheckConstraint("month >= 1 AND month <= 12", name="ck_seasonal_avail_month_range"),
        Index("ix_seasonal_avail_month", "month"),
        Index("ix_seasonal_avail_type", "type"),
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


# ==================== Impostor-Spiel ====================

class ImpostorCategory(Base):
    __tablename__ = "impostor_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    words = relationship(
        "ImpostorWord",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="ImpostorWord.word",
    )


class ImpostorWord(Base):
    __tablename__ = "impostor_words"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(
        Integer,
        ForeignKey("impostor_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    word = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("category_id", "word", name="uq_impostor_word_per_category"),
    )

    category = relationship("ImpostorCategory", back_populates="words")


class RecipeComment(Base):
    __tablename__ = "recipe_comments"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    content = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    edited = Column(Boolean, nullable=False, default=False, server_default="false")

    recipe = relationship("Recipe", backref="comments")
    user = relationship("User")

    __table_args__ = (
        Index("ix_recipe_comments_recipe_created", "recipe_id", "created_at"),
    )


# ============================================================
# Foto-Tagebuch (Admin-only)
# ============================================================

class PhotoDiaryEntry(Base):
    __tablename__ = "photo_diary_entries"
    id = Column(Integer, primary_key=True, index=True)
    entry_date = Column(Date, nullable=False, index=True)
    entry_time = Column(Time, nullable=False, server_default=func.current_time())
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    images = relationship(
        "PhotoDiaryImage",
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="PhotoDiaryImage.position",
    )


class PhotoDiaryImage(Base):
    __tablename__ = "photo_diary_images"
    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(
        Integer,
        ForeignKey("photo_diary_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url = Column(String, nullable=False)
    thumb_url = Column(String, nullable=False)
    caption = Column(String(500), nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    entry = relationship("PhotoDiaryEntry", back_populates="images")

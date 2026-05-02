"""
Impostor-Spiel API.

Public:
- GET  /impostor/categories                 — Liste aktiver Kategorien (für Setup)
- POST /impostor/random                     — Ein zufälliges Wort aus den gewählten Kategorien

Admin:
- GET    /impostor/admin/categories         — Alle Kategorien (inkl. inaktiver)
- POST   /impostor/admin/categories         — Neue Kategorie
- PATCH  /impostor/admin/categories/{id}    — Kategorie umbenennen / (de-)aktivieren
- DELETE /impostor/admin/categories/{id}    — Kategorie + Wörter löschen
- GET    /impostor/admin/categories/{id}/words — Wörter einer Kategorie
- POST   /impostor/admin/categories/{id}/words — Ein oder mehrere Wörter hinzufügen
- DELETE /impostor/admin/words/{id}         — Einzelnes Wort löschen
"""

from datetime import datetime
from typing import Optional
import random

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from auth import require_admin
import models

router = APIRouter(prefix="/impostor", tags=["impostor"])


# ---------- Pydantic Schemas ----------

class CategoryPublic(BaseModel):
    """Öffentliche Sicht: nur das Nötigste fürs Setup."""
    id: int
    name: str
    word_count: int

    model_config = {"from_attributes": True}


class CategoryAdmin(BaseModel):
    id: int
    name: str
    is_active: bool
    sort_order: int
    word_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class WordRead(BaseModel):
    id: int
    word: str

    model_config = {"from_attributes": True}


class WordsCreate(BaseModel):
    """Akzeptiert ein Wort oder mehrere (Bulk)."""
    words: list[str] = Field(..., min_length=1, max_length=200)

    @field_validator("words")
    @classmethod
    def clean_words(cls, v: list[str]) -> list[str]:
        cleaned = []
        seen = set()
        for w in v:
            w = w.strip()
            if not w:
                continue
            if len(w) > 100:
                raise ValueError(f"Wort zu lang (max 100 Zeichen): {w[:30]}…")
            key = w.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(w)
        if not cleaned:
            raise ValueError("Mindestens ein gültiges Wort erforderlich")
        return cleaned


class RandomRequest(BaseModel):
    category_ids: list[int] = Field(..., min_length=1, max_length=50)


class RandomResponse(BaseModel):
    word: str
    category_id: int
    category_name: str


# ---------- Helpers ----------

def _category_to_admin(cat: models.ImpostorCategory) -> CategoryAdmin:
    return CategoryAdmin(
        id=cat.id,
        name=cat.name,
        is_active=cat.is_active,
        sort_order=cat.sort_order,
        word_count=len(cat.words),
        created_at=cat.created_at,
    )


def _category_to_public(cat: models.ImpostorCategory) -> CategoryPublic:
    return CategoryPublic(id=cat.id, name=cat.name, word_count=len(cat.words))


# ---------- Public Endpoints ----------

@router.get("/categories", response_model=list[CategoryPublic])
def list_active_categories(db: Session = Depends(get_db)):
    """Aktive Kategorien mit mindestens einem Wort, für den Setup-Screen."""
    cats = (
        db.query(models.ImpostorCategory)
        .filter(models.ImpostorCategory.is_active.is_(True))
        .order_by(models.ImpostorCategory.sort_order, models.ImpostorCategory.name)
        .all()
    )
    return [_category_to_public(c) for c in cats if len(c.words) > 0]


@router.post("/random", response_model=RandomResponse)
def random_word(payload: RandomRequest, db: Session = Depends(get_db)):
    """
    Liefert genau ein zufälliges Wort aus einer der gewählten (und aktiven)
    Kategorien. Strategie: Zuerst zufällig eine Kategorie wählen (gewichtet
    nach Wortanzahl, damit kleine Kategorien nicht überrepräsentiert werden),
    dann ein zufälliges Wort daraus.
    """
    cats = (
        db.query(models.ImpostorCategory)
        .filter(
            models.ImpostorCategory.id.in_(payload.category_ids),
            models.ImpostorCategory.is_active.is_(True),
        )
        .all()
    )
    if not cats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine gültige Kategorie ausgewählt",
        )

    weighted = [(c, len(c.words)) for c in cats if len(c.words) > 0]
    if not weighted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ausgewählte Kategorien enthalten keine Wörter",
        )

    cats_only, weights = zip(*weighted)
    chosen_cat = random.choices(cats_only, weights=weights, k=1)[0]
    chosen_word = random.choice(chosen_cat.words)

    return RandomResponse(
        word=chosen_word.word,
        category_id=chosen_cat.id,
        category_name=chosen_cat.name,
    )


# ---------- Admin: Categories ----------

@router.get("/admin/categories", response_model=list[CategoryAdmin])
def admin_list_categories(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cats = (
        db.query(models.ImpostorCategory)
        .order_by(models.ImpostorCategory.sort_order, models.ImpostorCategory.name)
        .all()
    )
    return [_category_to_admin(c) for c in cats]


@router.post("/admin/categories", response_model=CategoryAdmin, status_code=status.HTTP_201_CREATED)
def admin_create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    existing = (
        db.query(models.ImpostorCategory)
        .filter(models.ImpostorCategory.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Kategorie mit diesem Namen existiert bereits",
        )

    cat = models.ImpostorCategory(
        name=payload.name,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _category_to_admin(cat)


@router.patch("/admin/categories/{category_id}", response_model=CategoryAdmin)
def admin_update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cat = db.get(models.ImpostorCategory, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategorie nicht gefunden")

    if payload.name is not None and payload.name != cat.name:
        clash = (
            db.query(models.ImpostorCategory)
            .filter(
                models.ImpostorCategory.name == payload.name,
                models.ImpostorCategory.id != category_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Kategorie mit diesem Namen existiert bereits",
            )
        cat.name = payload.name

    if payload.is_active is not None:
        cat.is_active = payload.is_active
    if payload.sort_order is not None:
        cat.sort_order = payload.sort_order

    db.commit()
    db.refresh(cat)
    return _category_to_admin(cat)


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cat = db.get(models.ImpostorCategory, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategorie nicht gefunden")
    db.delete(cat)
    db.commit()


# ---------- Admin: Words ----------

@router.get("/admin/categories/{category_id}/words", response_model=list[WordRead])
def admin_list_words(
    category_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cat = db.get(models.ImpostorCategory, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategorie nicht gefunden")
    return [WordRead.model_validate(w) for w in cat.words]


@router.post(
    "/admin/categories/{category_id}/words",
    response_model=list[WordRead],
    status_code=status.HTTP_201_CREATED,
)
def admin_create_words(
    category_id: int,
    payload: WordsCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cat = db.get(models.ImpostorCategory, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategorie nicht gefunden")

    existing_lower = {w.word.lower() for w in cat.words}
    new_words: list[models.ImpostorWord] = []
    for w in payload.words:
        if w.lower() in existing_lower:
            continue
        word_obj = models.ImpostorWord(category_id=category_id, word=w)
        db.add(word_obj)
        new_words.append(word_obj)
        existing_lower.add(w.lower())

    if not new_words:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alle übergebenen Wörter existieren bereits in dieser Kategorie",
        )

    db.commit()
    for w in new_words:
        db.refresh(w)
    return [WordRead.model_validate(w) for w in new_words]


@router.delete("/admin/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    word = db.get(models.ImpostorWord, word_id)
    if not word:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wort nicht gefunden")
    db.delete(word)
    db.commit()

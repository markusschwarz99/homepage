"""
Codewort-Spiel API.

Public:
- GET  /codewort/packs                   — Liste aktiver Wortpakete (fürs Setup)
- POST /codewort/draw                     — 25 verschiedene Wörter aus einem Paket ziehen

Admin:
- GET    /codewort/admin/packs            — Alle Pakete (inkl. inaktiver)
- POST   /codewort/admin/packs            — Neues Paket
- PATCH  /codewort/admin/packs/{id}       — Paket umbenennen / (de-)aktivieren
- DELETE /codewort/admin/packs/{id}       — Paket + Wörter löschen
- GET    /codewort/admin/packs/{id}/words — Wörter eines Pakets
- POST   /codewort/admin/packs/{id}/words — Ein oder mehrere Wörter hinzufügen
- DELETE /codewort/admin/words/{id}       — Einzelnes Wort löschen
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

router = APIRouter(prefix="/codewort", tags=["codewort"])

# Eine Partie besteht immer aus genau 25 Karten (5×5).
BOARD_SIZE = 25


# ---------- Pydantic Schemas ----------

class PackPublic(BaseModel):
    """Öffentliche Sicht: nur das Nötigste fürs Setup."""
    id: int
    name: str
    word_count: int

    model_config = {"from_attributes": True}


class PackAdmin(BaseModel):
    id: int
    name: str
    is_active: bool
    sort_order: int
    word_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PackCreate(BaseModel):
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


class PackUpdate(BaseModel):
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
    words: list[str] = Field(..., min_length=1, max_length=500)

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


class DrawRequest(BaseModel):
    pack_id: int
    count: int = Field(BOARD_SIZE, ge=1, le=100)
    # Zuletzt gespielte Wörter, die möglichst gemieden werden sollen (§9).
    exclude: list[str] = Field(default_factory=list, max_length=1000)


class DrawResponse(BaseModel):
    pack_id: int
    pack_name: str
    words: list[str]


# ---------- Helpers ----------

def _pack_to_admin(pack: models.CodewortPack) -> PackAdmin:
    return PackAdmin(
        id=pack.id,
        name=pack.name,
        is_active=pack.is_active,
        sort_order=pack.sort_order,
        word_count=len(pack.words),
        created_at=pack.created_at,
    )


def _pack_to_public(pack: models.CodewortPack) -> PackPublic:
    return PackPublic(id=pack.id, name=pack.name, word_count=len(pack.words))


# ---------- Public Endpoints ----------

@router.get("/packs", response_model=list[PackPublic])
def list_active_packs(db: Session = Depends(get_db)):
    """Aktive Pakete mit mindestens einem Wort, für den Setup-Screen.

    Das Frontend blendet Pakete mit weniger als 25 Wörtern als nicht spielbar
    aus bzw. deaktiviert sie — der Wortzähler wird dafür mitgeliefert.
    """
    packs = (
        db.query(models.CodewortPack)
        .filter(models.CodewortPack.is_active.is_(True))
        .order_by(models.CodewortPack.sort_order, models.CodewortPack.name)
        .all()
    )
    return [_pack_to_public(p) for p in packs if len(p.words) > 0]


@router.post("/draw", response_model=DrawResponse)
def draw_words(payload: DrawRequest, db: Session = Depends(get_db)):
    """Zieht `count` (Default 25) paarweise verschiedene Wörter aus einem aktiven
    Paket, ohne Zurücklegen (INV-17). Wörter aus `exclude` werden bevorzugt
    gemieden; reicht der Rest nicht für eine volle Auslage, wird die Meidung
    ignoriert.
    """
    pack = (
        db.query(models.CodewortPack)
        .filter(
            models.CodewortPack.id == payload.pack_id,
            models.CodewortPack.is_active.is_(True),
        )
        .first()
    )
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wortpaket nicht gefunden oder inaktiv",
        )

    all_words = [w.word for w in pack.words]
    if len(all_words) < payload.count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Paket enthält nur {len(all_words)} Wörter, "
                f"benötigt werden {payload.count}."
            ),
        )

    exclude_lower = {w.strip().lower() for w in payload.exclude}
    preferred = [w for w in all_words if w.lower() not in exclude_lower]

    if len(preferred) >= payload.count:
        chosen = random.sample(preferred, payload.count)
    else:
        # Nicht genug ungenutzte Wörter: mit den gemiedenen auffüllen.
        rest = [w for w in all_words if w.lower() in exclude_lower]
        random.shuffle(rest)
        chosen = preferred + rest[: payload.count - len(preferred)]
        random.shuffle(chosen)

    return DrawResponse(pack_id=pack.id, pack_name=pack.name, words=chosen)


# ---------- Admin: Packs ----------

@router.get("/admin/packs", response_model=list[PackAdmin])
def admin_list_packs(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    packs = (
        db.query(models.CodewortPack)
        .order_by(models.CodewortPack.sort_order, models.CodewortPack.name)
        .all()
    )
    return [_pack_to_admin(p) for p in packs]


@router.post("/admin/packs", response_model=PackAdmin, status_code=status.HTTP_201_CREATED)
def admin_create_pack(
    payload: PackCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    existing = (
        db.query(models.CodewortPack)
        .filter(models.CodewortPack.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Paket mit diesem Namen existiert bereits",
        )

    pack = models.CodewortPack(
        name=payload.name,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return _pack_to_admin(pack)


@router.patch("/admin/packs/{pack_id}", response_model=PackAdmin)
def admin_update_pack(
    pack_id: int,
    payload: PackUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    pack = db.get(models.CodewortPack, pack_id)
    if not pack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paket nicht gefunden")

    if payload.name is not None and payload.name != pack.name:
        clash = (
            db.query(models.CodewortPack)
            .filter(
                models.CodewortPack.name == payload.name,
                models.CodewortPack.id != pack_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Paket mit diesem Namen existiert bereits",
            )
        pack.name = payload.name

    if payload.is_active is not None:
        pack.is_active = payload.is_active
    if payload.sort_order is not None:
        pack.sort_order = payload.sort_order

    db.commit()
    db.refresh(pack)
    return _pack_to_admin(pack)


@router.delete("/admin/packs/{pack_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_pack(
    pack_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    pack = db.get(models.CodewortPack, pack_id)
    if not pack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paket nicht gefunden")
    db.delete(pack)
    db.commit()


# ---------- Admin: Words ----------

@router.get("/admin/packs/{pack_id}/words", response_model=list[WordRead])
def admin_list_words(
    pack_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    pack = db.get(models.CodewortPack, pack_id)
    if not pack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paket nicht gefunden")
    return [WordRead.model_validate(w) for w in pack.words]


@router.post(
    "/admin/packs/{pack_id}/words",
    response_model=list[WordRead],
    status_code=status.HTTP_201_CREATED,
)
def admin_create_words(
    pack_id: int,
    payload: WordsCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    pack = db.get(models.CodewortPack, pack_id)
    if not pack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paket nicht gefunden")

    existing_lower = {w.word.lower() for w in pack.words}
    new_words: list[models.CodewortWord] = []
    for w in payload.words:
        if w.lower() in existing_lower:
            continue
        word_obj = models.CodewortWord(pack_id=pack_id, word=w)
        db.add(word_obj)
        new_words.append(word_obj)
        existing_lower.add(w.lower())

    if not new_words:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alle übergebenen Wörter existieren bereits in diesem Paket",
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
    word = db.get(models.CodewortWord, word_id)
    if not word:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wort nicht gefunden")
    db.delete(word)
    db.commit()

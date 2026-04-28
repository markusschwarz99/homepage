"""
Seasonal Calendar API.

Datenmodell:
- SeasonalItem (id, name, category, notes, ...)
- SeasonalAvailabilityEntry (item_id, month, type)  -- Composite-PK

Pro (item, month) können mehrere types vorkommen (z.B. regional + storage).
Im API-Schema werden die types pro Monat in einer Liste gruppiert.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, exists, and_
from sqlalchemy.orm import Session, selectinload

from database import get_db
from auth import require_member, require_admin
import models

router = APIRouter(prefix="/seasonal", tags=["seasonal"])


# ---------- Pydantic Schemas ----------

class MonthAvailability(BaseModel):
    """Verfügbarkeit eines Items in einem bestimmten Monat (mehrere Typen möglich)."""
    month: int = Field(..., ge=1, le=12)
    types: list[models.SeasonalAvailability] = Field(..., min_length=1)

    @field_validator("types")
    @classmethod
    def dedupe_types(cls, v):
        # Reihenfolge konsistent: regional, storage, import
        order = {
            models.SeasonalAvailability.regional: 0,
            models.SeasonalAvailability.storage: 1,
            models.SeasonalAvailability.import_: 2,
        }
        return sorted(set(v), key=lambda t: order[t])


class SeasonalItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: models.SeasonalCategory
    availabilities: list[MonthAvailability] = Field(..., min_length=1, max_length=12)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("availabilities")
    @classmethod
    def validate_unique_months(cls, v: list[MonthAvailability]):
        months = [entry.month for entry in v]
        if len(months) != len(set(months)):
            raise ValueError("Jeder Monat darf nur einmal vorkommen")
        # Nach Monat sortieren für konsistente Antworten
        return sorted(v, key=lambda e: e.month)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class SeasonalItemCreate(SeasonalItemBase):
    pass


class SeasonalItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[models.SeasonalCategory] = None
    availabilities: Optional[list[MonthAvailability]] = Field(None, min_length=1, max_length=12)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("availabilities")
    @classmethod
    def validate_unique_months(cls, v):
        if v is None:
            return v
        months = [entry.month for entry in v]
        if len(months) != len(set(months)):
            raise ValueError("Jeder Monat darf nur einmal vorkommen")
        return sorted(v, key=lambda e: e.month)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class SeasonalItemRead(BaseModel):
    id: int
    name: str
    category: models.SeasonalCategory
    availabilities: list[MonthAvailability]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- Helpers ----------

def _serialize_item(item: models.SeasonalItem) -> SeasonalItemRead:
    """ORM-Item -> Read-Schema mit gruppierten Monaten."""
    by_month: dict[int, list[models.SeasonalAvailability]] = defaultdict(list)
    for entry in item.availabilities:
        by_month[entry.month].append(entry.type)

    grouped = [
        MonthAvailability(month=m, types=sorted(set(types), key=_avail_sort_key))
        for m, types in sorted(by_month.items())
    ]

    return SeasonalItemRead(
        id=item.id,
        name=item.name,
        category=item.category,
        availabilities=grouped,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _avail_sort_key(t: models.SeasonalAvailability) -> int:
    order = {
        models.SeasonalAvailability.regional: 0,
        models.SeasonalAvailability.storage: 1,
        models.SeasonalAvailability.import_: 2,
    }
    return order[t]


def _replace_availabilities(
    db: Session,
    item: models.SeasonalItem,
    payload: list[MonthAvailability],
) -> None:
    """Komplette Liste der Verfügbarkeiten ersetzen (delete + insert)."""
    # Bestehende Einträge löschen (cascade-orphan macht das via Liste auch,
    # aber explizit ist deutlicher)
    item.availabilities.clear()
    db.flush()

    for entry in payload:
        for t in entry.types:
            item.availabilities.append(
                models.SeasonalAvailabilityEntry(month=entry.month, type=t)
            )


# ---------- Read endpoints (Member+) ----------

@router.get("", response_model=list[SeasonalItemRead])
def list_items(
    category: Optional[models.SeasonalCategory] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    type: Optional[models.SeasonalAvailability] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    query = (
        db.query(models.SeasonalItem)
        .options(selectinload(models.SeasonalItem.availabilities))
    )
    if category is not None:
        query = query.filter(models.SeasonalItem.category == category)
    if month is not None or type is not None:
        # Subquery: existiert ein passender Eintrag in seasonal_availabilities?
        avail_alias = models.SeasonalAvailabilityEntry
        conditions = [avail_alias.item_id == models.SeasonalItem.id]
        if month is not None:
            conditions.append(avail_alias.month == month)
        if type is not None:
            conditions.append(avail_alias.type == type)
        query = query.filter(exists().where(and_(*conditions)))

    items = query.order_by(models.SeasonalItem.category, models.SeasonalItem.name).all()
    return [_serialize_item(i) for i in items]


@router.get("/current", response_model=list[SeasonalItemRead])
def list_current(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    current_month = datetime.now(timezone.utc).month
    avail_alias = models.SeasonalAvailabilityEntry
    items = (
        db.query(models.SeasonalItem)
        .options(selectinload(models.SeasonalItem.availabilities))
        .filter(
            exists().where(
                and_(
                    avail_alias.item_id == models.SeasonalItem.id,
                    avail_alias.month == current_month,
                )
            )
        )
        .order_by(models.SeasonalItem.category, models.SeasonalItem.name)
        .all()
    )
    return [_serialize_item(i) for i in items]


@router.get("/{item_id}", response_model=SeasonalItemRead)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    item = (
        db.query(models.SeasonalItem)
        .options(selectinload(models.SeasonalItem.availabilities))
        .filter(models.SeasonalItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item nicht gefunden")
    return _serialize_item(item)


# ---------- Write endpoints (Admin only) ----------

@router.post("", response_model=SeasonalItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: SeasonalItemCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    existing = (
        db.query(models.SeasonalItem)
        .filter(func.lower(models.SeasonalItem.name) == payload.name.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ein Item mit dem Namen '{payload.name}' existiert bereits",
        )

    item = models.SeasonalItem(
        name=payload.name,
        category=payload.category,
        notes=payload.notes,
    )
    for entry in payload.availabilities:
        for t in entry.types:
            item.availabilities.append(
                models.SeasonalAvailabilityEntry(month=entry.month, type=t)
            )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.patch("/{item_id}", response_model=SeasonalItemRead)
def update_item(
    item_id: int,
    payload: SeasonalItemUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = (
        db.query(models.SeasonalItem)
        .options(selectinload(models.SeasonalItem.availabilities))
        .filter(models.SeasonalItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item nicht gefunden")

    update_data = payload.model_dump(exclude_unset=True)

    # Name-Konflikt prüfen (case-insensitive, andere Items)
    if "name" in update_data and update_data["name"].lower() != item.name.lower():
        conflict = (
            db.query(models.SeasonalItem)
            .filter(
                func.lower(models.SeasonalItem.name) == update_data["name"].lower(),
                models.SeasonalItem.id != item_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ein Item mit dem Namen '{update_data['name']}' existiert bereits",
            )

    # Skalare Felder
    if "name" in update_data:
        item.name = update_data["name"]
    if "category" in update_data:
        item.category = update_data["category"]
    if "notes" in update_data:
        item.notes = update_data["notes"]

    # Availabilities — Replace-Semantik
    if payload.availabilities is not None:
        _replace_availabilities(db, item, payload.availabilities)

    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.SeasonalItem).filter(models.SeasonalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item nicht gefunden")
    db.delete(item)
    db.commit()
    return None

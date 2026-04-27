from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from auth import require_member, require_admin
from db_types import months_contains
import models

router = APIRouter(prefix="/seasonal", tags=["seasonal"])


# ---------- Pydantic Schemas ----------

class SeasonalItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: models.SeasonalCategory
    months: list[int] = Field(..., min_length=1, max_length=12)
    availability: models.SeasonalAvailability = models.SeasonalAvailability.regional
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("months")
    @classmethod
    def validate_months(cls, v: list[int]) -> list[int]:
        if not all(1 <= m <= 12 for m in v):
            raise ValueError("Monate müssen zwischen 1 und 12 liegen")
        return sorted(set(v))

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
    months: Optional[list[int]] = Field(None, min_length=1, max_length=12)
    availability: Optional[models.SeasonalAvailability] = None
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("months")
    @classmethod
    def validate_months(cls, v):
        if v is None:
            return v
        if not all(1 <= m <= 12 for m in v):
            raise ValueError("Monate müssen zwischen 1 und 12 liegen")
        return sorted(set(v))

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name darf nicht leer sein")
        return v


class SeasonalItemRead(SeasonalItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- Read endpoints (Member+) ----------

@router.get("", response_model=list[SeasonalItemRead])
def list_items(
    category: Optional[models.SeasonalCategory] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    query = db.query(models.SeasonalItem)
    if category is not None:
        query = query.filter(models.SeasonalItem.category == category)
    if month is not None:
        query = query.filter(months_contains(models.SeasonalItem.months, month))
    return query.order_by(models.SeasonalItem.category, models.SeasonalItem.name).all()


@router.get("/current", response_model=list[SeasonalItemRead])
def list_current(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    current_month = datetime.now(timezone.utc).month
    return (
        db.query(models.SeasonalItem)
        .filter(months_contains(models.SeasonalItem.months, current_month))
        .order_by(models.SeasonalItem.category, models.SeasonalItem.name)
        .all()
    )


@router.get("/{item_id}", response_model=SeasonalItemRead)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    item = db.query(models.SeasonalItem).filter(models.SeasonalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item nicht gefunden")
    return item


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
    item = models.SeasonalItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SeasonalItemRead)
def update_item(
    item_id: int,
    payload: SeasonalItemUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.SeasonalItem).filter(models.SeasonalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item nicht gefunden")

    update_data = payload.model_dump(exclude_unset=True)

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

    for key, value in update_data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


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

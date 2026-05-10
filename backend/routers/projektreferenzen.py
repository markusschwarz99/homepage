"""
Projektreferenzen API (Admin only).

- GET    /projektreferenzen/      — Alle Referenzen (sortiert nach date_from desc)
- POST   /projektreferenzen/      — Neue Referenz anlegen
- PATCH  /projektreferenzen/{id}  — Referenz bearbeiten
- DELETE /projektreferenzen/{id}  — Referenz löschen
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from auth import require_admin
import models

router = APIRouter(prefix="/projektreferenzen", tags=["projektreferenzen"])


# ---------- Schemas ----------

class ProjectReferenceRead(BaseModel):
    id: int
    title: str
    date_from: date
    date_to: Optional[date]
    industry: str
    contact: str
    fte: float
    topic: str
    roles: str
    responsibilities: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectReferenceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    date_from: date
    date_to: Optional[date] = None
    industry: str = Field(..., min_length=1, max_length=200)
    contact: str = Field(..., min_length=1, max_length=200)
    fte: float = Field(..., gt=0)
    topic: str = Field(..., min_length=1)
    roles: str = Field(..., min_length=1)
    responsibilities: str = Field(..., min_length=1)

    @field_validator("title", "industry", "contact", "topic", "roles", "responsibilities")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


class ProjectReferenceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    industry: Optional[str] = Field(None, min_length=1, max_length=200)
    contact: Optional[str] = Field(None, min_length=1, max_length=200)
    fte: Optional[float] = Field(None, gt=0)
    topic: Optional[str] = Field(None, min_length=1)
    roles: Optional[str] = Field(None, min_length=1)
    responsibilities: Optional[str] = Field(None, min_length=1)

    @field_validator("title", "industry", "contact", "topic", "roles", "responsibilities")
    @classmethod
    def strip_text(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


# ---------- Endpoints ----------

@router.get("/", response_model=list[ProjectReferenceRead])
def list_references(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return (
        db.query(models.ProjectReference)
        .order_by(models.ProjectReference.date_from.desc(), models.ProjectReference.id.desc())
        .all()
    )


@router.post("/", response_model=ProjectReferenceRead, status_code=status.HTTP_201_CREATED)
def create_reference(
    payload: ProjectReferenceCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    ref = models.ProjectReference(**payload.model_dump())
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return ref


@router.patch("/{ref_id}", response_model=ProjectReferenceRead)
def update_reference(
    ref_id: int,
    payload: ProjectReferenceUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    ref = db.get(models.ProjectReference, ref_id)
    if not ref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenz nicht gefunden")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ref, field, value)

    db.commit()
    db.refresh(ref)
    return ref


@router.delete("/{ref_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reference(
    ref_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    ref = db.get(models.ProjectReference, ref_id)
    if not ref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenz nicht gefunden")
    db.delete(ref)
    db.commit()

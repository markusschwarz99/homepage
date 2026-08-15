from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import require_member, require_admin
import models
from pydantic import BaseModel, Field

router = APIRouter(prefix="/improvements", tags=["improvements"])


# ---------- Schemas ----------

class ImprovementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: Literal["bug", "idee", "sonstiges"]
    description: str = Field(min_length=1)

class ImprovementStatusUpdate(BaseModel):
    status: Literal["offen", "geplant", "erledigt", "abgelehnt"]


def _serialize(imp: models.Improvement) -> dict:
    return {
        "id": imp.id,
        "title": imp.title,
        "category": imp.category,
        "description": imp.description,
        "status": imp.status,
        "created_at": imp.created_at.isoformat() if imp.created_at else None,
        "submitter_name": imp.user.name if imp.user else None,
        "submitter_email": imp.user.email if imp.user else None,
    }


# ---------- Erfassen (Member+) ----------

@router.post("")
def create_improvement(
    data: ImprovementCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    imp = models.Improvement(
        user_id=user.id,
        title=data.title.strip(),
        category=data.category,
        description=data.description.strip(),
    )
    db.add(imp)
    db.commit()
    db.refresh(imp)
    return _serialize(imp)


# ---------- Verwaltung (Admin) ----------

@router.get("")
def list_improvements(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    improvements = (
        db.query(models.Improvement)
        .order_by(models.Improvement.created_at.desc(), models.Improvement.id.desc())
        .all()
    )
    return [_serialize(imp) for imp in improvements]


@router.patch("/{improvement_id}")
def update_improvement_status(
    improvement_id: int,
    data: ImprovementStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    imp = db.query(models.Improvement).filter(models.Improvement.id == improvement_id).first()
    if not imp:
        raise HTTPException(status_code=404, detail="Vorschlag nicht gefunden")
    imp.status = data.status
    db.commit()
    db.refresh(imp)
    return _serialize(imp)


@router.delete("/{improvement_id}")
def delete_improvement(
    improvement_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    imp = db.query(models.Improvement).filter(models.Improvement.id == improvement_id).first()
    if not imp:
        raise HTTPException(status_code=404, detail="Vorschlag nicht gefunden")
    db.delete(imp)
    db.commit()
    return {"message": "Vorschlag gelöscht"}

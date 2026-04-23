from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from database import get_db
from auth import require_member, require_admin
import models
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tags", tags=["tags"])


# ---------- Schemas ----------

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)

class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1)

class TagCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1)

class TagUpdate(BaseModel):
    name: str = Field(min_length=1)


# ---------- Public (Member) – Lesen zum Filtern ----------

@router.get("")
def list_all(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    """Alle Kategorien inkl. ihrer Tags – zum Filtern und im Rezept-Formular."""
    categories = (
        db.query(models.TagCategory)
        .options(selectinload(models.TagCategory.tags))
        .order_by(models.TagCategory.position, models.TagCategory.id)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "position": c.position,
            "tags": [
                {"id": t.id, "name": t.name, "position": t.position, "category_id": t.category_id}
                for t in c.tags
            ],
        }
        for c in categories
    ]


# ---------- Admin: Kategorien ----------

@router.post("/categories")
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    max_pos = db.query(models.TagCategory).count()
    cat = models.TagCategory(name=data.name.strip(), position=max_pos)
    db.add(cat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "position": cat.position}


@router.patch("/categories/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    cat = db.query(models.TagCategory).filter(models.TagCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    cat.name = data.name.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Name bereits vergeben")
    return {"message": "Kategorie aktualisiert"}


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    cat = db.query(models.TagCategory).filter(models.TagCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    db.delete(cat)  # cascade löscht alle Tags (und Rezept-Zuordnungen)
    db.commit()
    return {"message": "Kategorie gelöscht"}


# ---------- Admin: Tags ----------

@router.post("/tags")
def create_tag(
    data: TagCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    cat = db.query(models.TagCategory).filter(models.TagCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    max_pos = db.query(models.Tag).filter(models.Tag.category_id == data.category_id).count()
    tag = models.Tag(category_id=data.category_id, name=data.name.strip(), position=max_pos)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tag existiert bereits in dieser Kategorie")
    db.refresh(tag)
    return {
        "id": tag.id,
        "name": tag.name,
        "position": tag.position,
        "category_id": tag.category_id,
    }


@router.patch("/tags/{tag_id}")
def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    tag.name = data.name.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Name bereits vergeben")
    return {"message": "Tag aktualisiert"}


@router.delete("/tags/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    db.delete(tag)
    db.commit()
    return {"message": "Tag gelöscht"}

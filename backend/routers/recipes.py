from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from database import get_db
from auth import require_member, require_admin
import models
from pydantic import BaseModel, Field
from typing import Optional
import os
from upload_utils import save_image

router = APIRouter(prefix="/recipes", tags=["recipes"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- Pydantic Schemas ----------

class IngredientIn(BaseModel):
    amount: Optional[float] = None
    unit: str = ""
    name: str

class StepIn(BaseModel):
    content: str

class ImageIn(BaseModel):
    url: str

class RecipeCreate(BaseModel):
    title: str = Field(min_length=1)
    servings: int = Field(default=4, ge=1)
    servings_unit: str = "Portionen"
    ingredients: list[IngredientIn] = []
    steps: list[StepIn] = []
    images: list[ImageIn] = []
    tag_ids: list[int] = []

class RecipeUpdate(RecipeCreate):
    pass


# ---------- Helpers ----------

def _serialize_recipe(r: models.Recipe, detail: bool = False) -> dict:
    base = {
        "id": r.id,
        "title": r.title,
        "servings": r.servings,
        "servings_unit": r.servings_unit,
        "author_id": r.author_id,
        "author_name": r.author.name if r.author else "",
        "created_at": r.created_at.isoformat() + "Z",
        "updated_at": r.updated_at.isoformat() + "Z",
        "cover_image": r.images[0].url if r.images else None,
        "tags": [
            {"id": t.id, "name": t.name, "category_id": t.category_id}
            for t in r.tags
        ],
    }
    if detail:
        base["images"] = [
            {"id": i.id, "url": i.url, "position": i.position} for i in r.images
        ]
        base["ingredients"] = [
            {
                "id": i.id,
                "position": i.position,
                "amount": i.amount,
                "unit": i.unit,
                "name": i.name,
            }
            for i in r.ingredients
        ]
        base["steps"] = [
            {"id": s.id, "position": s.position, "content": s.content}
            for s in r.steps
        ]
    return base


def _replace_children(db: Session, recipe: models.Recipe, data: RecipeCreate):
    """Zutaten, Schritte, Bilder, Tags komplett ersetzen."""
    recipe.ingredients.clear()
    recipe.steps.clear()
    recipe.images.clear()
    db.flush()

    for idx, ing in enumerate(data.ingredients):
        recipe.ingredients.append(models.RecipeIngredient(
            position=idx, amount=ing.amount, unit=ing.unit, name=ing.name,
        ))
    for idx, st in enumerate(data.steps):
        recipe.steps.append(models.RecipeStep(position=idx, content=st.content))
    for idx, img in enumerate(data.images):
        recipe.images.append(models.RecipeImage(position=idx, url=img.url))

    if data.tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(data.tag_ids)).all()
        recipe.tags = tags
    else:
        recipe.tags = []


# ---------- Routes ----------

@router.get("")
def list_recipes(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
    q: Optional[str] = None,
    tag_ids: Optional[str] = Query(None, description="Komma-separierte Tag-IDs"),
):
    """
    Filter:
    - q: Volltextsuche in Titel + Zutat-Namen
    - tag_ids: Komma-separiert. Innerhalb einer Kategorie = ODER, zwischen Kategorien = UND.
    """
    query = (
        db.query(models.Recipe)
        .options(
            selectinload(models.Recipe.images),
            selectinload(models.Recipe.tags),
            selectinload(models.Recipe.author),
        )
    )

    if q:
        like = f"%{q.lower()}%"
        recipe_ids_by_ingredient = (
            db.query(models.RecipeIngredient.recipe_id)
            .filter(func.lower(models.RecipeIngredient.name).like(like))
            .subquery()
        )
        query = query.filter(
            (func.lower(models.Recipe.title).like(like))
            | (models.Recipe.id.in_(recipe_ids_by_ingredient))
        )

    if tag_ids:
        try:
            ids = [int(x) for x in tag_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Ungültige tag_ids")

        if ids:
            tags = db.query(models.Tag).filter(models.Tag.id.in_(ids)).all()
            by_category: dict[int, list[int]] = {}
            for t in tags:
                by_category.setdefault(t.category_id, []).append(t.id)

            # Pro Kategorie: mindestens einer der Tags muss matchen (OR)
            # Kategorien untereinander: alle müssen matchen (AND)
            for cat_id, cat_tag_ids in by_category.items():
                subq = (
                    db.query(models.RecipeTag.recipe_id)
                    .filter(models.RecipeTag.tag_id.in_(cat_tag_ids))
                    .subquery()
                )
                query = query.filter(models.Recipe.id.in_(subq))

    recipes = query.order_by(models.Recipe.created_at.desc()).all()
    return [_serialize_recipe(r) for r in recipes]


@router.get("/{recipe_id}")
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    recipe = (
        db.query(models.Recipe)
        .options(
            selectinload(models.Recipe.images),
            selectinload(models.Recipe.ingredients),
            selectinload(models.Recipe.steps),
            selectinload(models.Recipe.tags),
            selectinload(models.Recipe.author),
        )
        .filter(models.Recipe.id == recipe_id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    return _serialize_recipe(recipe, detail=True)


@router.post("")
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    recipe = models.Recipe(
        title=data.title,
        servings=data.servings,
        servings_unit=data.servings_unit,
        author_id=user.id,
    )
    db.add(recipe)
    db.flush()
    _replace_children(db, recipe, data)
    db.commit()
    db.refresh(recipe)
    return {"id": recipe.id, "message": "Rezept erstellt"}


@router.patch("/{recipe_id}")
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    # Member dürfen nur eigene Rezepte bearbeiten; Admins alle
    if not user.is_admin and recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Du darfst nur eigene Rezepte bearbeiten")

    recipe.title = data.title
    recipe.servings = data.servings
    recipe.servings_unit = data.servings_unit
    _replace_children(db, recipe, data)
    db.commit()
    return {"message": "Rezept aktualisiert"}


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),  # NUR Admin
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    db.delete(recipe)
    db.commit()
    return {"message": "Rezept gelöscht"}


@router.post("/upload-image")
def upload_recipe_image(
    file: UploadFile = File(...),
    user: models.User = Depends(require_member),
):
    filename = save_image(file, UPLOAD_DIR, prefix="recipe_")
    return {"url": f"https://api.markus-schwarz.cc/uploads/{filename}"}

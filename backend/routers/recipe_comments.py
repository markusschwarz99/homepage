from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel, Field, field_validator

from database import get_db
from auth import require_member
from rate_limit import limiter
import models

router = APIRouter(prefix="/recipes", tags=["recipe_comments"])


# ---------- Pydantic Schemas ----------

class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Kommentar darf nicht leer sein")
        return v


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Kommentar darf nicht leer sein")
        return v


# ---------- Helpers ----------

def _serialize_comment(c: models.RecipeComment) -> dict:
    return {
        "id": c.id,
        "recipe_id": c.recipe_id,
        "user_id": c.user_id,
        "user_name": c.user.name if c.user else "Gelöschter Nutzer",
        "content": c.content,
        "edited": c.edited,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


def _get_comment_or_404(db: Session, recipe_id: int, comment_id: int) -> models.RecipeComment:
    c = (
        db.query(models.RecipeComment)
        .options(selectinload(models.RecipeComment.user))
        .filter(
            models.RecipeComment.id == comment_id,
            models.RecipeComment.recipe_id == recipe_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Kommentar nicht gefunden")
    return c


def _can_modify(comment: models.RecipeComment, user: models.User) -> bool:
    return user.is_admin or comment.user_id == user.id


# ---------- Endpoints ----------

@router.get("/{recipe_id}/comments")
def list_comments(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_member),
):
    # Sicherstellen, dass Rezept existiert (verhindert Info-Leak via Comment-IDs)
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    comments = (
        db.query(models.RecipeComment)
        .options(selectinload(models.RecipeComment.user))
        .filter(models.RecipeComment.recipe_id == recipe_id)
        .order_by(models.RecipeComment.created_at.asc())
        .all()
    )
    return [_serialize_comment(c) for c in comments]


@router.post("/{recipe_id}/comments", status_code=201)
@limiter.limit("10/minute")
def create_comment(
    request: Request,
    recipe_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_member),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    comment = models.RecipeComment(
        recipe_id=recipe_id,
        user_id=current_user.id,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    # User für Serialisierung nachladen
    db.refresh(comment, attribute_names=["user"])
    return _serialize_comment(comment)


@router.patch("/{recipe_id}/comments/{comment_id}")
def update_comment(
    recipe_id: int,
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_member),
):
    comment = _get_comment_or_404(db, recipe_id, comment_id)
    if not _can_modify(comment, current_user):
        raise HTTPException(status_code=403, detail="Nicht autorisiert")

    new_content = payload.content.strip()
    if new_content != comment.content:
        comment.content = new_content
        comment.edited = True
        db.commit()
        db.refresh(comment)
    return _serialize_comment(comment)


@router.delete("/{recipe_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    recipe_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_member),
):
    comment = _get_comment_or_404(db, recipe_id, comment_id)
    if not _can_modify(comment, current_user):
        raise HTTPException(status_code=403, detail="Nicht autorisiert")

    db.delete(comment)
    db.commit()
    return None

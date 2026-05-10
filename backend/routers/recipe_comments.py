from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel, Field, field_validator

from database import get_db
from auth import require_member
from routers.notifications import (
    create_recipe_comment_notification,
    create_recipe_comment_reply_notification,
)
from rate_limit import limiter
import models

router = APIRouter(prefix="/recipes", tags=["recipe_comments"])


# ---------- Pydantic Schemas ----------

class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    parent_id: Optional[int] = None

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
        "parent_id": c.parent_id,
        "edited": c.edited,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


def _build_comment_tree(comments: list[models.RecipeComment]) -> list[dict]:
    """
    Nimmt eine flache Liste aller Kommentare eines Rezepts und gibt nested zurück:
    Top-Level-Kommentare mit `replies`-Array.

    - Top-Level: chronologisch (created_at ASC, so wie aus der DB-Query gekommen).
    - Replies: neuester zuerst (created_at DESC, ID-Tiebreaker bei gleichem Timestamp).
    """
    by_parent: dict[int, list[models.RecipeComment]] = {}
    top_level: list[models.RecipeComment] = []
    for c in comments:
        if c.parent_id is None:
            top_level.append(c)
        else:
            by_parent.setdefault(c.parent_id, []).append(c)

    result = []
    for parent in top_level:
        replies = by_parent.get(parent.id, [])
        replies.sort(key=lambda r: (r.created_at, r.id), reverse=True)
        item = _serialize_comment(parent)
        item["replies"] = [_serialize_comment(r) for r in replies]
        result.append(item)
    return result


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
    return _build_comment_tree(comments)


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

    # parent_id validieren: existiert, gleiches Rezept, ist Top-Level (flach: 1 Level)
    parent_comment: Optional[models.RecipeComment] = None
    if payload.parent_id is not None:
        parent_comment = (
            db.query(models.RecipeComment)
            .filter(
                models.RecipeComment.id == payload.parent_id,
                models.RecipeComment.recipe_id == recipe_id,
            )
            .first()
        )
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent-Kommentar nicht gefunden")
        if parent_comment.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Antworten auf Antworten sind nicht erlaubt",
            )

    comment = models.RecipeComment(
        recipe_id=recipe_id,
        user_id=current_user.id,
        parent_id=parent_comment.id if parent_comment else None,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    db.refresh(comment, attribute_names=["user"])

    # Notifications: Helper machen Self-Check selbst (recipient_id == actor_id → None).
    # Dedupe-Regel: wenn Rezept-Owner == Parent-Author, NUR Reply-Notification senden
    # (spezifischer; vermeidet Doppel-Benachrichtigung).
    parent_author_id = parent_comment.user_id if parent_comment else None
    try:
        if parent_comment is not None and parent_author_id is not None:
            create_recipe_comment_reply_notification(
                db,
                recipient_id=parent_author_id,
                actor_id=current_user.id,
                actor_name=current_user.name,
                recipe_id=recipe.id,
                recipe_title=recipe.title,
                comment_id=comment.id,
                parent_comment_id=parent_comment.id,
            )
        if recipe.author_id and recipe.author_id != parent_author_id:
            create_recipe_comment_notification(
                db,
                recipient_id=recipe.author_id,
                actor_id=current_user.id,
                actor_name=current_user.name,
                recipe_id=recipe.id,
                recipe_title=recipe.title,
                comment_id=comment.id,
            )
        db.commit()
    except Exception:
        # Notification-Fehler darf den Comment-Create nicht killen
        db.rollback()

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
    """
    Löscht einen Kommentar. Bei Top-Level-Kommentaren werden alle Replies
    via DB-Cascade (ON DELETE CASCADE auf parent_id) automatisch mit-gelöscht.
    """
    comment = _get_comment_or_404(db, recipe_id, comment_id)
    if not _can_modify(comment, current_user):
        raise HTTPException(status_code=403, detail="Nicht autorisiert")

    db.delete(comment)
    db.commit()
    return None

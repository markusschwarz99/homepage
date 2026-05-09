"""
Notifications-Router.

Stellt Endpunkte für das Auflisten, Markieren-als-gelesen und Lesen
des Unread-Counts bereit. Die Tabelle ist generisch (siehe models.Notification),
sodass künftige Notification-Typen ohne Schema-Änderung dazukommen können.

Aktuell unterstützte Typen:
- recipe_comment: jemand hat einen Kommentar zu einem Rezept verfasst,
  dessen Autor der Empfänger ist.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import require_member
import models

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------- Helpers ----------

def _serialize(n: models.Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type.value if hasattr(n.type, "value") else n.type,
        "payload": n.payload,
        "read": n.read,
        "created_at": n.created_at.isoformat() + "Z",
    }


def create_recipe_comment_notification(
    db: Session,
    *,
    recipient_id: int,
    actor_id: int,
    actor_name: str,
    recipe_id: int,
    recipe_title: str,
    comment_id: int,
) -> Optional[models.Notification]:
    """
    Helper, der von routers/recipe_comments.py aufgerufen wird.

    Erzeugt KEINE Notification, wenn Empfänger == Akteur (Owner kommentiert
    sein eigenes Rezept). Alle anderen Fälle erzeugen eine Notification.

    Wirft NICHT — Fehler beim Anlegen sollen den Comment-Create nicht
    blockieren. Stattdessen leise None zurückgeben (Logging im Caller).
    """
    if recipient_id == actor_id:
        return None

    notif = models.Notification(
        user_id=recipient_id,
        type=models.NotificationType.recipe_comment,
        payload={
            "recipe_id": recipe_id,
            "recipe_title": recipe_title,
            "comment_id": comment_id,
            "actor_id": actor_id,
            "actor_name": actor_name,
        },
    )
    db.add(notif)
    db.flush()
    return notif


# ---------- Endpoints ----------

@router.get("")
def list_notifications(
    limit: int = Query(5, ge=1, le=50),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    """
    Notifications des aktuellen Users, neueste zuerst.

    Default: limit=5 (Glocken-Popup), max 50.
    """
    q = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    )
    if unread_only:
        q = q.filter(models.Notification.read.is_(False))

    total = q.count()
    items = (
        q.order_by(models.Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "items": [_serialize(n) for n in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    """Kleiner Badge-Endpoint für die Glocke."""
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user.id,
            models.Notification.read.is_(False),
        )
        .count()
    )
    return {"count": count}


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification nicht gefunden")
    if not notif.read:
        notif.read = True
        db.commit()
    return {"id": notif.id, "read": True}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    updated = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user.id,
            models.Notification.read.is_(False),
        )
        .update({"read": True}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated}

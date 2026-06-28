"""
Einkaufslisten-Digest: periodischer Check auf neue Artikel und Sammel-Mail.

Wird vom In-Prozess-Scheduler (scheduler.py) alle SHOPPING_DIGEST_INTERVAL_SECONDS
aufgerufen. Der State (bis wohin bereits benachrichtigt wurde) liegt als
Highwater-Mark im site_settings-Key WATERMARK_KEY — bewusst NICHT in den
ALLOWED_KEYS der Settings-API, damit der Wert nicht von außen les-/schreibbar ist.
"""
import logging
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

import email_service
import models

logger = logging.getLogger("uvicorn")

WATERMARK_KEY = "shopping_notify_watermark"
# Sentinel für "leere Liste beim ersten Lauf" — jeder künftige Artikel ist neuer.
_EPOCH = datetime(1970, 1, 1)


def _get_watermark(db: Session):
    setting = (
        db.query(models.SiteSetting)
        .filter(models.SiteSetting.key == WATERMARK_KEY)
        .first()
    )
    if setting is None or not setting.value:
        return None
    try:
        return datetime.fromisoformat(setting.value)
    except ValueError:
        return None


def _set_watermark(db: Session, value: datetime):
    setting = (
        db.query(models.SiteSetting)
        .filter(models.SiteSetting.key == WATERMARK_KEY)
        .first()
    )
    if setting:
        setting.value = value.isoformat()
    else:
        db.add(models.SiteSetting(key=WATERMARK_KEY, value=value.isoformat()))


def _item_dict(item: models.ShoppingItem) -> dict:
    return {
        "name": item.name,
        "quantity": item.quantity,
        "description": item.description,
    }


def run_shopping_digest(db: Session) -> bool:
    """
    Prüft auf neue Einkaufslisten-Artikel seit dem letzten Watermark und schickt
    bei Bedarf eine Sammel-Mail an alle household-/admin-User.

    Returns True, wenn eine Mail-Runde verschickt wurde, sonst False.
    """
    watermark = _get_watermark(db)

    # Erster Lauf: Baseline auf den neuesten Bestands-Artikel setzen, damit der
    # vorhandene Listen-Inhalt NICHT als "neu" verschickt wird.
    if watermark is None:
        newest = db.query(func.max(models.ShoppingItem.added_at)).scalar()
        _set_watermark(db, newest or _EPOCH)
        db.commit()
        return False

    new_items = (
        db.query(models.ShoppingItem)
        .filter(models.ShoppingItem.added_at > watermark)
        .order_by(models.ShoppingItem.added_at.asc())
        .all()
    )
    if not new_items:
        return False

    all_items = (
        db.query(models.ShoppingItem)
        .order_by(models.ShoppingItem.added_at.desc())
        .all()
    )
    recipients = (
        db.query(models.User)
        .filter(models.User.role.in_(["household", "admin"]))
        .all()
    )

    new_payload = [_item_dict(i) for i in new_items]
    all_payload = [_item_dict(i) for i in all_items]

    for user in recipients:
        if not user.email:
            continue
        try:
            email_service.send_shopping_list_digest(
                user.email, user.name, new_payload, all_payload
            )
        except Exception:
            logger.exception(
                "Einkaufslisten-Digest: Versand an %s fehlgeschlagen", user.email
            )

    # Watermark auf das neueste gerade gemeldete Item fortschreiben — DB-Wert
    # gegen DB-Wert, damit keine Python/Postgres-Zeitzonen-Mischung entsteht.
    _set_watermark(db, max(i.added_at for i in new_items))
    db.commit()

    logger.info(
        "Einkaufslisten-Digest: %d neue Artikel an %d Empfänger verschickt",
        len(new_items),
        len(recipients),
    )
    return True

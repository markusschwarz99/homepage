from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from database import get_db
from auth import require_admin
import models
import email_service
from pydantic import BaseModel, Field

router = APIRouter(prefix="/newsletter", tags=["newsletter"])

VALID_ROLES = {"guest", "member", "household", "admin"}

class NewsletterSend(BaseModel):
    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)
    recipe_ids: list[int] = []
    user_ids: list[int] = []
    roles: list[str] = []

@router.post("/send")
def send_newsletter(
    data: NewsletterSend,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if not data.subject.strip() or not data.body.strip():
        raise HTTPException(status_code=400, detail="Betreff und Text dürfen nicht leer sein")

    invalid_roles = set(data.roles) - VALID_ROLES
    if invalid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Rolle: {', '.join(sorted(invalid_roles))}"
        )

    # Empfänger: Rollen-Gruppen ∪ Einzelnutzer, dedupliziert per User-ID
    recipients: dict[int, models.User] = {}
    if data.roles:
        for u in db.query(models.User).filter(models.User.role.in_(data.roles)).all():
            recipients[u.id] = u
    if data.user_ids:
        for u in db.query(models.User).filter(models.User.id.in_(data.user_ids)).all():
            recipients[u.id] = u
    if not recipients:
        raise HTTPException(status_code=400, detail="Keine Empfänger ausgewählt")

    recipes: list[dict] = []
    if data.recipe_ids:
        found = {
            r.id: r
            for r in db.query(models.Recipe)
            .options(selectinload(models.Recipe.images))
            .filter(models.Recipe.id.in_(data.recipe_ids))
            .all()
        }
        missing = [rid for rid in data.recipe_ids if rid not in found]
        if missing:
            raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
        recipes = [
            {
                "id": rid,
                "title": found[rid].title,
                "image_url": found[rid].images[0].url if found[rid].images else None,
            }
            for rid in data.recipe_ids
        ]

    sent = 0
    failed = 0
    for u in recipients.values():
        try:
            email_service.send_newsletter_email(
                u.email, u.name, data.subject.strip(), data.body, recipes
            )
            sent += 1
        except Exception as e:
            print(f"Newsletter email error for {u.email}: {e}")
            failed += 1

    return {"sent": sent, "failed": failed}

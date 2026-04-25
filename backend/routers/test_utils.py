"""
Test-Only Utility-Endpoints für E2E-Tests.

WICHTIG: Dieses Modul wird in main.py NUR registriert, wenn ENVIRONMENT=test.
In Production existiert dieser Router nicht — die Endpoints sind dort nicht
erreichbar und können nicht missbraucht werden.

Doppelter Sicherheits-Check beim Import: Wenn ENVIRONMENT != test,
wirft der Import einen RuntimeError.
"""
import os

if os.getenv("ENVIRONMENT") != "test":
    raise RuntimeError(
        "test_utils Router darf nur in ENVIRONMENT=test geladen werden!"
    )

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/test", tags=["test-utils"])


@router.post("/cleanup/recipes")
def cleanup_recipes(db: Session = Depends(get_db)):
    """Löscht alle Rezepte (inklusive Zutaten, Schritte, Bilder, Tag-Zuordnungen)."""
    deleted = db.query(models.Recipe).delete()
    db.commit()
    return {"deleted_recipes": deleted}


@router.post("/cleanup/tags")
def cleanup_tags(db: Session = Depends(get_db)):
    """
    Löscht alle Tag-Kategorien und Tags.
    Reihenfolge wichtig: erst Tags (Children), dann Kategorien (Parents),
    weil Bulk-Delete keine ORM-Cascades triggert.
    """
    deleted_tags = db.query(models.Tag).delete()
    deleted_categories = db.query(models.TagCategory).delete()
    db.commit()
    return {
        "deleted_categories": deleted_categories,
        "deleted_tags": deleted_tags,
    }


@router.post("/cleanup/blog")
def cleanup_blog(db: Session = Depends(get_db)):
    """Löscht alle Blog-Posts."""
    deleted = db.query(models.BlogPost).delete()
    db.commit()
    return {"deleted_posts": deleted}


@router.post("/cleanup/all")
def cleanup_all(db: Session = Depends(get_db)):
    """
    Löscht alle Test-Daten außer Usern.
    User bleiben erhalten, weil Seed sie anlegt.
    """
    recipes = db.query(models.Recipe).delete()
    posts = db.query(models.BlogPost).delete()
    tags = db.query(models.Tag).delete()
    categories = db.query(models.TagCategory).delete()
    db.commit()
    return {
        "deleted_recipes": recipes,
        "deleted_posts": posts,
        "deleted_categories": categories,
        "deleted_tags": tags,
    }

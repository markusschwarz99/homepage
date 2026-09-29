"""
hongar.markus-schwarz.cc – API für die Almgasthof-Website.

Die Seiten sind im hongar-Frontend fest gestaltet; ihre Texte liegen als JSON
im site_settings-Key "hongar_content" (nicht im öffentlichen Repo, Pflege per
scripts/hongar_content.py). Über die Redaktion bearbeitbar sind nur die
globalen Texte (Aktuelles, Öffnungszeiten, Kontakt, Links) und die
Veranstaltungen.

Lesen (öffentlich bei HONGAR_PUBLIC=true, sonst nur hongar-Redaktion/Admin):
- GET    /hongar/config                      — {public: bool}, immer offen
- GET    /hongar/content                     — Seiteninhalte (JSON)
- GET    /hongar/settings                    — globale Texte (Öffnungszeiten, …)
- GET    /hongar/events                      — kommende Veranstaltungen

Redaktion (Rolle hongar oder admin):
- GET    /hongar/admin/events                — alle Veranstaltungen inkl. vergangener
- POST   /hongar/events                      — Veranstaltung anlegen
- PATCH  /hongar/events/{id}                 — Veranstaltung ändern
- DELETE /hongar/events/{id}                 — Veranstaltung löschen
- PATCH  /hongar/settings                    — globale Texte ändern

Rich-Text wird beim Speichern serverseitig mit nh3 gegen eine Allowlist
gesäubert.
"""

import json
import os
from datetime import date
from typing import Optional

import nh3
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from auth import get_current_user, require_hongar_editor
from database import get_db
import models

router = APIRouter(prefix="/hongar", tags=["hongar"])

ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "s", "h2", "h3", "h4",
    "ul", "ol", "li", "blockquote", "a", "img", "hr",
}
ALLOWED_ATTRIBUTES = {
    "a": {"href", "title"},
    "img": {"src", "alt", "title"},
    "p": {"style"},
    "h2": {"style"},
    "h3": {"style"},
    "h4": {"style"},
}


def sanitize_html(html: str) -> str:
    cleaned = nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        link_rel="noopener noreferrer",
        filter_style_properties={"text-align"},
    )
    # nh3 lässt style="" stehen, wenn alle Eigenschaften herausgefiltert wurden
    return cleaned.replace(' style=""', "")


# ---------- Zugriff ----------

_optional_oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def _is_public() -> bool:
    return os.getenv("HONGAR_PUBLIC", "false").lower() == "true"


def hongar_viewer(
    token: Optional[str] = Depends(_optional_oauth2),
    db: Session = Depends(get_db),
):
    """Offen bei HONGAR_PUBLIC=true, sonst wie require_hongar_editor (Testphase)."""
    if _is_public():
        return None
    if not token:
        raise HTTPException(status_code=401, detail="Login erforderlich")
    user = get_current_user(token, db)
    if not user.is_hongar_editor:
        raise HTTPException(status_code=403, detail="Nur die hongar-Redaktion hat Zugriff")
    return user


# ---------- Schemas ----------

class EventCreate(BaseModel):
    event_date: date
    time_label: str = Field(default="", max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5_000)

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Titel darf nicht leer sein")
        return v


class EventUpdate(BaseModel):
    event_date: Optional[date] = None
    time_label: Optional[str] = Field(default=None, max_length=50)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5_000)

    @field_validator("title")
    @classmethod
    def _title(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else EventCreate._title(v)


class HongarSettings(BaseModel):
    opening_hours: str = ""
    news: str = ""
    contact: str = ""
    facebook_url: str = ""
    booking_url: str = ""
    webcam_urls: str = ""  # eine URL pro Zeile


class HongarSettingsUpdate(BaseModel):
    opening_hours: Optional[str] = Field(default=None, max_length=10_000)
    news: Optional[str] = Field(default=None, max_length=20_000)
    contact: Optional[str] = Field(default=None, max_length=10_000)
    facebook_url: Optional[str] = Field(default=None, max_length=500)
    booking_url: Optional[str] = Field(default=None, max_length=500)
    webcam_urls: Optional[str] = Field(default=None, max_length=2_000)


# Rich-Text-Felder werden gesäubert, URL-Felder auf https geprüft.
HTML_SETTING_FIELDS = {"opening_hours", "news", "contact"}
URL_SETTING_FIELDS = {"facebook_url", "booking_url", "webcam_urls"}
SETTING_PREFIX = "hongar_"
# Seiteninhalte (JSON), gepflegt per scripts/hongar_content.py
CONTENT_KEY = "hongar_content"


# ---------- Helper ----------

def _serialize_event(event: models.HongarEvent) -> dict:
    return {
        "id": event.id,
        "event_date": event.event_date.isoformat(),
        "time_label": event.time_label,
        "title": event.title,
        "description": event.description,
    }


def _ordered_events(db: Session):
    return db.query(models.HongarEvent).order_by(
        models.HongarEvent.event_date, models.HongarEvent.id
    )


def _get_event(db: Session, event_id: int) -> models.HongarEvent:
    event = db.query(models.HongarEvent).filter(models.HongarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Veranstaltung nicht gefunden")
    return event


def _check_https_lines(field: str, value: str):
    for line in value.splitlines():
        line = line.strip()
        if line and not line.startswith("https://"):
            raise HTTPException(status_code=400, detail=f"{field}: nur https-Links erlaubt")


def _read_settings(db: Session) -> HongarSettings:
    rows = db.query(models.SiteSetting).filter(
        models.SiteSetting.key.in_([SETTING_PREFIX + f for f in HongarSettings.model_fields])
    ).all()
    values = {r.key[len(SETTING_PREFIX):]: r.value for r in rows}
    return HongarSettings(**values)


# ---------- Lesen ----------

@router.get("/config")
def get_config():
    return {"public": _is_public()}


@router.get("/content")
def get_content(db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == CONTENT_KEY).first()
    if not row:
        return {"pages": []}
    return json.loads(row.value)


@router.get("/events")
def list_upcoming_events(db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    events = _ordered_events(db).filter(models.HongarEvent.event_date >= date.today()).all()
    return [_serialize_event(e) for e in events]


@router.get("/settings", response_model=HongarSettings)
def get_settings(db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    return _read_settings(db)


# ---------- Redaktion: Veranstaltungen ----------

@router.get("/admin/events")
def list_all_events(db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    return [_serialize_event(e) for e in _ordered_events(db).all()]


@router.post("/events")
def create_event(data: EventCreate, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    event = models.HongarEvent(
        event_date=data.event_date,
        time_label=data.time_label.strip(),
        title=data.title,
        description=data.description.strip(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _serialize_event(event)


@router.patch("/events/{event_id}")
def update_event(
    event_id: int,
    data: EventUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    event = _get_event(db, event_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        setattr(event, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(event)
    return _serialize_event(event)


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    db.delete(_get_event(db, event_id))
    db.commit()
    return {"message": "Veranstaltung gelöscht"}


# ---------- Redaktion: globale Texte ----------

@router.patch("/settings", response_model=HongarSettings)
def update_settings(
    data: HongarSettingsUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        if field in HTML_SETTING_FIELDS:
            value = sanitize_html(value)
        elif field in URL_SETTING_FIELDS:
            value = value.strip()
            _check_https_lines(field, value)
        key = SETTING_PREFIX + field
        setting = db.query(models.SiteSetting).filter(models.SiteSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(models.SiteSetting(key=key, value=value))
    db.commit()
    return _read_settings(db)

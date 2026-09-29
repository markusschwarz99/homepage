"""
hongar.markus-schwarz.cc – CMS-API für die Almgasthof-Website.

Lesen (öffentlich bei HONGAR_PUBLIC=true, sonst nur hongar-Redaktion/Admin):
- GET    /hongar/config                      — {public: bool}, immer offen
- GET    /hongar/pages                       — veröffentlichte Seiten (Nav, flach)
- GET    /hongar/pages/{slug}                — veröffentlichte Seite inkl. Galerie
- GET    /hongar/settings                    — globale Texte (Öffnungszeiten, …)

Redaktion (Rolle hongar oder admin):
- GET    /hongar/admin/pages                 — alle Seiten inkl. Entwürfe
- GET    /hongar/admin/pages/{id}            — eine Seite inkl. Galerie
- POST   /hongar/pages                       — Seite anlegen
- PATCH  /hongar/pages/reorder               — Reihenfolge per ID-Liste
- PATCH  /hongar/pages/{id}                  — Seite bearbeiten
- DELETE /hongar/pages/{id}                  — Seite löschen
- POST   /hongar/images                      — Bild hochladen (Titelbild/Inline)
- POST   /hongar/pages/{id}/images           — Galerie-Bild hochladen
- PATCH  /hongar/pages/{id}/images/reorder   — Galerie-Reihenfolge
- PATCH  /hongar/pages/{id}/images/{img_id}  — Bildunterschrift ändern
- DELETE /hongar/pages/{id}/images/{img_id}  — Galerie-Bild entfernen
- PATCH  /hongar/settings                    — globale Texte ändern

Rich-Text wird beim Speichern serverseitig mit nh3 gegen eine Allowlist
gesäubert. Bilder liegen im normalen Upload-Volume (Prefix "hongar_") und
werden als relativer Pfad "/uploads/<datei>" zurückgegeben.
"""

import os
import re
from typing import List, Optional

import nh3
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from auth import get_current_user, require_hongar_editor
from database import get_db
from upload_utils import save_image
import models

router = APIRouter(prefix="/hongar", tags=["hongar"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# Feste Frontend-Routen, die nicht von CMS-Seiten überdeckt werden dürfen.
RESERVED_SLUGS = {"admin", "webcam"}
UPLOAD_NAME_RE = re.compile(r"^hongar_[0-9a-f]{32}\.(jpg|png|gif|webp)$")

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
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        link_rel="noopener noreferrer",
        filter_style_properties={"text-align"},
    )


def _upload_url(filename: Optional[str]) -> Optional[str]:
    return f"/uploads/{filename}" if filename else None


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

class PageCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    parent_id: Optional[int] = None
    content_html: str = Field(default="", max_length=200_000)
    cover_image: Optional[str] = None
    is_published: bool = False
    show_in_nav: bool = True

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError("Slug: nur a-z, 0-9 und Bindestriche")
        if v in RESERVED_SLUGS:
            raise ValueError("Slug ist reserviert")
        return v


class PageUpdate(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=1, max_length=100)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    parent_id: Optional[int] = None
    content_html: Optional[str] = Field(default=None, max_length=200_000)
    cover_image: Optional[str] = None
    is_published: Optional[bool] = None
    show_in_nav: Optional[bool] = None

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return PageCreate._slug(v)


class ReorderRequest(BaseModel):
    ids: List[int]


class ImageCaptionUpdate(BaseModel):
    caption: str = Field(max_length=300)


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


# ---------- Helper ----------

def _serialize_image(img: models.HongarPageImage) -> dict:
    return {
        "id": img.id,
        "url": _upload_url(img.filename),
        "caption": img.caption,
        "position": img.position,
    }


def _serialize_nav(page: models.HongarPage) -> dict:
    return {
        "id": page.id,
        "slug": page.slug,
        "title": page.title,
        "parent_id": page.parent_id,
        "position": page.position,
        "show_in_nav": page.show_in_nav,
        "is_published": page.is_published,
    }


def _serialize_full(page: models.HongarPage) -> dict:
    return {
        **_serialize_nav(page),
        "content_html": page.content_html,
        "cover_image": page.cover_image,
        "cover_image_url": _upload_url(page.cover_image),
        "images": [_serialize_image(i) for i in page.images],
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
    }


def _ordered_pages(db: Session):
    return db.query(models.HongarPage).order_by(
        models.HongarPage.position, models.HongarPage.id
    )


def _get_page(db: Session, page_id: int) -> models.HongarPage:
    page = db.query(models.HongarPage).filter(models.HongarPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Seite nicht gefunden")
    return page


def _check_slug_free(db: Session, slug: str, own_id: Optional[int] = None):
    q = db.query(models.HongarPage).filter(models.HongarPage.slug == slug)
    if own_id is not None:
        q = q.filter(models.HongarPage.id != own_id)
    if q.first():
        raise HTTPException(status_code=409, detail="Slug ist bereits vergeben")


def _check_parent(db: Session, parent_id: Optional[int], page: Optional[models.HongarPage] = None):
    """Navigation hat genau eine Ebene Unterseiten."""
    if parent_id is None:
        return
    if page is not None and parent_id == page.id:
        raise HTTPException(status_code=400, detail="Seite kann nicht ihre eigene Elternseite sein")
    parent = db.query(models.HongarPage).filter(models.HongarPage.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=400, detail="Elternseite existiert nicht")
    if parent.parent_id is not None:
        raise HTTPException(status_code=400, detail="Nur eine Ebene Unterseiten erlaubt")
    if page is not None:
        has_children = db.query(models.HongarPage).filter(
            models.HongarPage.parent_id == page.id
        ).first()
        if has_children:
            raise HTTPException(status_code=400, detail="Seite mit Unterseiten kann keine Unterseite werden")


def _check_cover(filename: Optional[str]):
    if filename and not UPLOAD_NAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="Ungültiges Titelbild")


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


@router.get("/pages")
def list_published_pages(db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    pages = _ordered_pages(db).filter(models.HongarPage.is_published.is_(True)).all()
    return [_serialize_nav(p) for p in pages]


@router.get("/pages/{slug}")
def get_published_page(slug: str, db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    page = db.query(models.HongarPage).filter(
        models.HongarPage.slug == slug,
        models.HongarPage.is_published.is_(True),
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Seite nicht gefunden")
    return _serialize_full(page)


@router.get("/settings", response_model=HongarSettings)
def get_settings(db: Session = Depends(get_db), _=Depends(hongar_viewer)):
    return _read_settings(db)


# ---------- Redaktion: Seiten ----------

@router.get("/admin/pages")
def list_all_pages(db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    return [_serialize_nav(p) for p in _ordered_pages(db).all()]


@router.get("/admin/pages/{page_id}")
def get_page_admin(page_id: int, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    return _serialize_full(_get_page(db, page_id))


@router.post("/pages")
def create_page(data: PageCreate, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    _check_slug_free(db, data.slug)
    _check_parent(db, data.parent_id)
    _check_cover(data.cover_image)
    last = db.query(models.HongarPage).order_by(models.HongarPage.position.desc()).first()
    page = models.HongarPage(
        slug=data.slug,
        title=data.title.strip(),
        parent_id=data.parent_id,
        position=(last.position + 1) if last else 0,
        content_html=sanitize_html(data.content_html),
        cover_image=data.cover_image,
        is_published=data.is_published,
        show_in_nav=data.show_in_nav,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return _serialize_full(page)


# Muss vor /pages/{page_id} stehen, sonst matcht "reorder" als page_id.
@router.patch("/pages/reorder")
def reorder_pages(data: ReorderRequest, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    pages = {p.id: p for p in db.query(models.HongarPage).filter(models.HongarPage.id.in_(data.ids)).all()}
    if len(pages) != len(set(data.ids)):
        raise HTTPException(status_code=400, detail="Unbekannte Seiten-ID")
    for index, page_id in enumerate(data.ids):
        pages[page_id].position = index
    db.commit()
    return {"message": "Reihenfolge gespeichert"}


@router.patch("/pages/{page_id}")
def update_page(
    page_id: int,
    data: PageUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    page = _get_page(db, page_id)
    fields = data.model_dump(exclude_unset=True)

    if "slug" in fields:
        if fields["slug"] is None:
            raise HTTPException(status_code=400, detail="Slug darf nicht leer sein")
        _check_slug_free(db, fields["slug"], own_id=page.id)
    if "title" in fields and fields["title"] is None:
        raise HTTPException(status_code=400, detail="Titel darf nicht leer sein")
    if "parent_id" in fields:
        _check_parent(db, fields["parent_id"], page)
    if "cover_image" in fields:
        _check_cover(fields["cover_image"])
    if "content_html" in fields:
        fields["content_html"] = sanitize_html(fields["content_html"] or "")
    if "title" in fields:
        fields["title"] = fields["title"].strip()
    for flag in ("is_published", "show_in_nav"):
        if flag in fields and fields[flag] is None:
            del fields[flag]

    for key, value in fields.items():
        setattr(page, key, value)
    db.commit()
    db.refresh(page)
    return _serialize_full(page)


@router.delete("/pages/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db), _=Depends(require_hongar_editor)):
    page = _get_page(db, page_id)
    # Unterseiten explizit lösen (SQLite in Tests setzt ON DELETE SET NULL nicht durch).
    db.query(models.HongarPage).filter(models.HongarPage.parent_id == page.id).update(
        {models.HongarPage.parent_id: None}
    )
    db.delete(page)
    db.commit()
    return {"message": "Seite gelöscht"}


# ---------- Redaktion: Bilder ----------

@router.post("/images")
def upload_image(file: UploadFile = File(...), _=Depends(require_hongar_editor)):
    filename = save_image(file, UPLOAD_DIR, prefix="hongar_")
    return {"filename": filename, "url": _upload_url(filename)}


@router.post("/pages/{page_id}/images")
def add_gallery_image(
    page_id: int,
    file: UploadFile = File(...),
    caption: str = Form("", max_length=300),
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    page = _get_page(db, page_id)
    filename = save_image(file, UPLOAD_DIR, prefix="hongar_")
    position = max((i.position for i in page.images), default=-1) + 1
    img = models.HongarPageImage(page_id=page.id, filename=filename, caption=caption.strip(), position=position)
    db.add(img)
    db.commit()
    db.refresh(img)
    return _serialize_image(img)


# Muss vor /pages/{page_id}/images/{image_id} stehen.
@router.patch("/pages/{page_id}/images/reorder")
def reorder_gallery(
    page_id: int,
    data: ReorderRequest,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    page = _get_page(db, page_id)
    images = {i.id: i for i in page.images}
    if set(data.ids) != set(images) or len(data.ids) != len(images):
        raise HTTPException(status_code=400, detail="ID-Liste passt nicht zur Galerie")
    for index, image_id in enumerate(data.ids):
        images[image_id].position = index
    db.commit()
    return {"message": "Reihenfolge gespeichert"}


def _get_image(db: Session, page_id: int, image_id: int) -> models.HongarPageImage:
    img = db.query(models.HongarPageImage).filter(
        models.HongarPageImage.id == image_id,
        models.HongarPageImage.page_id == page_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    return img


@router.patch("/pages/{page_id}/images/{image_id}")
def update_gallery_image(
    page_id: int,
    image_id: int,
    data: ImageCaptionUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    img = _get_image(db, page_id, image_id)
    img.caption = data.caption.strip()
    db.commit()
    db.refresh(img)
    return _serialize_image(img)


@router.delete("/pages/{page_id}/images/{image_id}")
def delete_gallery_image(
    page_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_hongar_editor),
):
    img = _get_image(db, page_id, image_id)
    db.delete(img)
    db.commit()
    return {"message": "Bild entfernt"}


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

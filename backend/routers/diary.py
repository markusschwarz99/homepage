"""
Foto-Tagebuch API (Admin-only).

Datenmodell:
- PhotoDiaryEntry: ein Eintrag pro (Datum, Zeit), mehrere pro Tag möglich.
- PhotoDiaryImage: 1:n zu Entry, mit optionaler Caption und Reihenfolge.

Bilder werden via save_diary_image() konvertiert (WebP) und mit Thumbnail
gespeichert. Files liegen unter UPLOAD_DIR/diary/ bzw. UPLOAD_DIR/diary/thumbs/.
"""
import os
from datetime import date as date_type, time as time_type
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from database import get_db
from auth import require_admin
from upload_utils import save_diary_image
import models

router = APIRouter(prefix="/diary", tags=["diary"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
DIARY_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "diary")
os.makedirs(DIARY_UPLOAD_DIR, exist_ok=True)


# ---------- Pydantic Schemas ----------

class ImageOut(BaseModel):
    id: int
    url: str
    thumb_url: str
    caption: Optional[str] = None
    position: int


class ImageUpdate(BaseModel):
    caption: Optional[str] = Field(None, max_length=500)


class ImageReorder(BaseModel):
    image_ids: list[int] = Field(..., min_length=1)


class EntryCreate(BaseModel):
    entry_date: date_type
    entry_time: Optional[time_type] = None
    description: Optional[str] = Field(None, max_length=10000)


class EntryUpdate(BaseModel):
    entry_date: Optional[date_type] = None
    entry_time: Optional[time_type] = None
    description: Optional[str] = Field(None, max_length=10000)


class EntryOut(BaseModel):
    id: int
    entry_date: date_type
    entry_time: time_type
    description: Optional[str] = None
    images: list[ImageOut]


# ---------- Helpers ----------

def _serialize_image(img: models.PhotoDiaryImage) -> dict:
    return {
        "id": img.id,
        "url": f"/uploads/diary/{img.url}",
        "thumb_url": f"/uploads/diary/thumbs/{img.thumb_url}",
        "caption": img.caption,
        "position": img.position,
    }


def _serialize_entry(entry: models.PhotoDiaryEntry) -> dict:
    return {
        "id": entry.id,
        "entry_date": entry.entry_date,
        "entry_time": entry.entry_time,
        "description": entry.description,
        "images": [_serialize_image(img) for img in entry.images],
    }


def _get_entry_or_404(entry_id: int, db: Session) -> models.PhotoDiaryEntry:
    entry = (
        db.query(models.PhotoDiaryEntry)
        .options(selectinload(models.PhotoDiaryEntry.images))
        .filter(models.PhotoDiaryEntry.id == entry_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return entry


def _delete_image_files(img: models.PhotoDiaryImage) -> None:
    """Löscht Voll- und Thumb-File von der Disk. Fehler werden geschluckt
    (DB ist Source of Truth — Datei-Leichen sind besser als verwaiste DB-Rows)."""
    for path in (
        os.path.join(DIARY_UPLOAD_DIR, img.url),
        os.path.join(DIARY_UPLOAD_DIR, "thumbs", img.thumb_url),
    ):
        try:
            if os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass


# ---------- Endpoints: Entries ----------

@router.get("", response_model=list[EntryOut])
def list_entries(
    date_from: Optional[date_type] = Query(None, alias="from"),
    date_to: Optional[date_type] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Alle Einträge, optional gefiltert nach Datumsbereich. Sortiert: neueste zuerst."""
    query = db.query(models.PhotoDiaryEntry).options(
        selectinload(models.PhotoDiaryEntry.images)
    )
    if date_from:
        query = query.filter(models.PhotoDiaryEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(models.PhotoDiaryEntry.entry_date <= date_to)
    query = query.order_by(
        models.PhotoDiaryEntry.entry_date.desc(),
        models.PhotoDiaryEntry.entry_time.desc(),
    )
    return [_serialize_entry(e) for e in query.all()]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    entry = _get_entry_or_404(entry_id, db)
    return _serialize_entry(entry)


@router.post("", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    data: EntryCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    entry = models.PhotoDiaryEntry(
        entry_date=data.entry_date,
        description=data.description,
    )
    if data.entry_time is not None:
        entry.entry_time = data.entry_time
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.patch("/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: int,
    data: EntryUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    entry = _get_entry_or_404(entry_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    entry = _get_entry_or_404(entry_id, db)
    # Files vor dem DB-Delete entfernen (cascade löscht die DB-Rows danach)
    for img in entry.images:
        _delete_image_files(img)
    db.delete(entry)
    db.commit()
    return None


# ---------- Endpoints: Images ----------

@router.post(
    "/{entry_id}/images",
    response_model=list[ImageOut],
    status_code=status.HTTP_201_CREATED,
)
def upload_images(
    entry_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Mehrere Bilder in einem Request hochladen. Werden ans Ende der Reihenfolge angehängt."""
    if not files:
        raise HTTPException(status_code=400, detail="Keine Dateien")

    entry = _get_entry_or_404(entry_id, db)

    # Aktuell höchste Position bestimmen, neue Bilder werden ans Ende angehängt
    max_position = max((img.position for img in entry.images), default=-1)

    saved: list[models.PhotoDiaryImage] = []
    saved_files: list[tuple[str, str]] = []  # für Rollback bei DB-Fehler
    try:
        for idx, file in enumerate(files, start=1):
            full_name, thumb_name = save_diary_image(file, DIARY_UPLOAD_DIR)
            saved_files.append((full_name, thumb_name))
            img = models.PhotoDiaryImage(
                entry_id=entry.id,
                url=full_name,
                thumb_url=thumb_name,
                position=max_position + idx,
            )
            db.add(img)
            saved.append(img)
        db.commit()
    except Exception:
        # Bereits geschriebene Files wieder weghauen, sonst Datei-Leichen
        db.rollback()
        for full_name, thumb_name in saved_files:
            for path in (
                os.path.join(DIARY_UPLOAD_DIR, full_name),
                os.path.join(DIARY_UPLOAD_DIR, "thumbs", thumb_name),
            ):
                try:
                    if os.path.isfile(path):
                        os.remove(path)
                except OSError:
                    pass
        raise

    for img in saved:
        db.refresh(img)
    return [_serialize_image(img) for img in saved]


@router.patch("/images/{image_id}", response_model=ImageOut)
def update_image(
    image_id: int,
    data: ImageUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    img = db.query(models.PhotoDiaryImage).filter(
        models.PhotoDiaryImage.id == image_id
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(img, field, value)
    db.commit()
    db.refresh(img)
    return _serialize_image(img)


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    img = db.query(models.PhotoDiaryImage).filter(
        models.PhotoDiaryImage.id == image_id
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    _delete_image_files(img)
    db.delete(img)
    db.commit()
    return None


@router.patch("/{entry_id}/images/reorder", response_model=list[ImageOut])
def reorder_images(
    entry_id: int,
    data: ImageReorder,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Neue Reihenfolge anhand der gelieferten Image-ID-Liste setzen.
    Alle Image-IDs müssen zum Eintrag gehören und vollständig sein."""
    entry = _get_entry_or_404(entry_id, db)
    existing_ids = {img.id for img in entry.images}
    given_ids = set(data.image_ids)
    if given_ids != existing_ids:
        raise HTTPException(
            status_code=400,
            detail="Image-ID-Liste muss exakt alle Bilder des Eintrags enthalten",
        )
    if len(data.image_ids) != len(set(data.image_ids)):
        raise HTTPException(status_code=400, detail="Doppelte Image-IDs")

    id_to_position = {img_id: pos for pos, img_id in enumerate(data.image_ids)}
    for img in entry.images:
        img.position = id_to_position[img.id]
    db.commit()
    db.refresh(entry)
    return [_serialize_image(img) for img in sorted(entry.images, key=lambda i: i.position)]

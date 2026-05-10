"""
CV API (Admin only).

Profile (Singleton):
- GET   /cv/profile  — Profil abrufen (null wenn noch nicht angelegt)
- PATCH /cv/profile  — Profil anlegen/aktualisieren (Upsert)

Experiences, Languages, Certificates, Educations:
- GET    /cv/<resource>/      — Liste
- POST   /cv/<resource>/      — Neuer Eintrag
- PATCH  /cv/<resource>/{id}  — Eintrag bearbeiten
- DELETE /cv/<resource>/{id}  — Eintrag löschen
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from auth import require_admin
import models

router = APIRouter(prefix="/cv", tags=["cv"])


# ────────────────────── Profile ──────────────────────

class CVProfileRead(BaseModel):
    id: int
    vorname: Optional[str]
    nachname: Optional[str]
    geburtsdatum: Optional[date]

    model_config = {"from_attributes": True}


class CVProfileUpdate(BaseModel):
    vorname: Optional[str] = Field(None, max_length=100)
    nachname: Optional[str] = Field(None, max_length=100)
    geburtsdatum: Optional[date] = None


@router.get("/profile", response_model=Optional[CVProfileRead])
def get_profile(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return db.query(models.CVProfile).first()


@router.patch("/profile", response_model=CVProfileRead)
def upsert_profile(
    payload: CVProfileUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    profile = db.query(models.CVProfile).first()
    if profile is None:
        profile = models.CVProfile()
        db.add(profile)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


# ────────────────────── Experiences ──────────────────────

class CVExperienceRead(BaseModel):
    id: int
    date_from: date
    date_to: Optional[date]
    rolle: str
    beschreibung: str
    sort_order: int

    model_config = {"from_attributes": True}


class CVExperienceCreate(BaseModel):
    date_from: date
    date_to: Optional[date] = None
    rolle: str = Field(..., min_length=1, max_length=200)
    beschreibung: str = Field(..., min_length=1)
    sort_order: int = 0

    @field_validator("rolle", "beschreibung")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


class CVExperienceUpdate(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    rolle: Optional[str] = Field(None, min_length=1, max_length=200)
    beschreibung: Optional[str] = Field(None, min_length=1)
    sort_order: Optional[int] = None

    @field_validator("rolle", "beschreibung")
    @classmethod
    def strip_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


@router.get("/experiences", response_model=list[CVExperienceRead])
def list_experiences(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return (
        db.query(models.CVExperience)
        .order_by(models.CVExperience.sort_order, models.CVExperience.date_from.desc(), models.CVExperience.id.desc())
        .all()
    )


@router.post("/experiences", response_model=CVExperienceRead, status_code=status.HTTP_201_CREATED)
def create_experience(
    payload: CVExperienceCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    exp = models.CVExperience(**payload.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.patch("/experiences/{item_id}", response_model=CVExperienceRead)
def update_experience(
    item_id: int,
    payload: CVExperienceUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVExperience, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/experiences/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVExperience, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    db.delete(item)
    db.commit()


# ────────────────────── Languages ──────────────────────

class CVLanguageRead(BaseModel):
    id: int
    sprache: str
    niveau: str
    sort_order: int

    model_config = {"from_attributes": True}


class CVLanguageCreate(BaseModel):
    sprache: str = Field(..., min_length=1, max_length=100)
    niveau: str = Field(..., min_length=1, max_length=100)
    sort_order: int = 0

    @field_validator("sprache", "niveau")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


class CVLanguageUpdate(BaseModel):
    sprache: Optional[str] = Field(None, min_length=1, max_length=100)
    niveau: Optional[str] = Field(None, min_length=1, max_length=100)
    sort_order: Optional[int] = None

    @field_validator("sprache", "niveau")
    @classmethod
    def strip_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


@router.get("/languages", response_model=list[CVLanguageRead])
def list_languages(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return (
        db.query(models.CVLanguage)
        .order_by(models.CVLanguage.sort_order, models.CVLanguage.id)
        .all()
    )


@router.post("/languages", response_model=CVLanguageRead, status_code=status.HTTP_201_CREATED)
def create_language(
    payload: CVLanguageCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    lang = models.CVLanguage(**payload.model_dump())
    db.add(lang)
    db.commit()
    db.refresh(lang)
    return lang


@router.patch("/languages/{item_id}", response_model=CVLanguageRead)
def update_language(
    item_id: int,
    payload: CVLanguageUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVLanguage, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/languages/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_language(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVLanguage, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    db.delete(item)
    db.commit()


# ────────────────────── Certificates ──────────────────────

class CVCertificateRead(BaseModel):
    id: int
    name: str
    jahr: int
    sort_order: int

    model_config = {"from_attributes": True}


class CVCertificateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    jahr: int = Field(..., ge=1900, le=2100)
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


class CVCertificateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    jahr: Optional[int] = Field(None, ge=1900, le=2100)
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def strip_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


@router.get("/certificates", response_model=list[CVCertificateRead])
def list_certificates(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return (
        db.query(models.CVCertificate)
        .order_by(models.CVCertificate.sort_order, models.CVCertificate.jahr.desc(), models.CVCertificate.id.desc())
        .all()
    )


@router.post("/certificates", response_model=CVCertificateRead, status_code=status.HTTP_201_CREATED)
def create_certificate(
    payload: CVCertificateCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    cert = models.CVCertificate(**payload.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.patch("/certificates/{item_id}", response_model=CVCertificateRead)
def update_certificate(
    item_id: int,
    payload: CVCertificateUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVCertificate, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/certificates/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificate(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVCertificate, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    db.delete(item)
    db.commit()


# ────────────────────── Educations ──────────────────────

class CVEducationRead(BaseModel):
    id: int
    date_from: date
    date_to: Optional[date]
    beschreibung: str
    sort_order: int

    model_config = {"from_attributes": True}


class CVEducationCreate(BaseModel):
    date_from: date
    date_to: Optional[date] = None
    beschreibung: str = Field(..., min_length=1)
    sort_order: int = 0

    @field_validator("beschreibung")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


class CVEducationUpdate(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    beschreibung: Optional[str] = Field(None, min_length=1)
    sort_order: Optional[int] = None

    @field_validator("beschreibung")
    @classmethod
    def strip_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Darf nicht leer sein")
        return v


@router.get("/educations", response_model=list[CVEducationRead])
def list_educations(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    return (
        db.query(models.CVEducation)
        .order_by(models.CVEducation.sort_order, models.CVEducation.date_from.desc(), models.CVEducation.id.desc())
        .all()
    )


@router.post("/educations", response_model=CVEducationRead, status_code=status.HTTP_201_CREATED)
def create_education(
    payload: CVEducationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    edu = models.CVEducation(**payload.model_dump())
    db.add(edu)
    db.commit()
    db.refresh(edu)
    return edu


@router.patch("/educations/{item_id}", response_model=CVEducationRead)
def update_education(
    item_id: int,
    payload: CVEducationUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVEducation, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/educations/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    item = db.get(models.CVEducation, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    db.delete(item)
    db.commit()

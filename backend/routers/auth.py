from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, auth
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from upload_utils import save_image
from email_service import send_verification_email, send_approved_email, send_password_reset_email
from fastapi import Request
from rate_limit import limiter


def _safe_send_verification(email: str, name: str, token: str):
    try:
        send_verification_email(email, name, token)
    except Exception as e:
        print(f"Email error: {e}")

def _safe_send_password_reset(email: str, name: str, token: str):
    try:
        send_password_reset_email(email, name, token)
    except Exception as e:
        print(f"Email error: {e}")

router = APIRouter(prefix="/auth", tags=["auth"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordReset(BaseModel):
    token: str
    new_password: str
    confirm_password: str

@router.post("/register")
@limiter.limit("5/hour")
def register(request: Request, user: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if len(user.password) < 12:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 12 Zeichen haben")
    user.email = user.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email bereits registriert")

    token = str(uuid.uuid4())
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=auth.hash_password(user.password),
        role="guest",
        is_verified=False,
        verification_token=token
    )
    db.add(new_user)
    db.commit()

    # Email asynchron verschicken, damit die Response nicht auf Resend wartet
    background_tasks.add_task(_safe_send_verification, user.email, user.name, token)

    return {"message": "Registrierung erfolgreich! Bitte bestätige deine Email-Adresse."}

@router.get("/verify")
@limiter.limit("20/hour")
def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Ungültiger Verifikationstoken")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email erfolgreich bestätigt! Warte auf Admin-Freigabe."}

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form.username.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Bitte bestätige zuerst deine Email-Adresse")
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    token = auth.create_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "is_admin": current_user.is_admin,
        "is_household": current_user.is_household,
        "is_member": current_user.is_member,
        "avatar_url": current_user.avatar_url or ""
    }

@router.patch("/me")
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if data.name is not None:
        current_user.name = data.name.strip()
    db.commit()
    return {"message": "Profil aktualisiert"}

@router.post("/me/password")
def update_password(
    data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not auth.verify_password(data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Neue Passwörter stimmen nicht überein")
    if len(data.new_password) < 12:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 12 Zeichen haben")
    current_user.password = auth.hash_password(data.new_password)
    db.commit()
    return {"message": "Passwort aktualisiert"}

@router.post("/me/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    filename = save_image(file, UPLOAD_DIR, prefix="avatar_")
    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    return {"avatar_url": current_user.avatar_url}


@router.post("/request-password-reset")
@limiter.limit("3/hour")
def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    email = data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()

    # Immer die gleiche Antwort, egal ob User existiert — verhindert Email-Enumeration
    generic_response = {"message": "Falls ein Account mit dieser Email existiert, wurde eine Email verschickt."}

    if not user or not user.is_verified:
        return generic_response

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    try:
        send_password_reset_email(user.email, user.name, token)
    except Exception as e:
        print(f"Email error: {e}")

    return generic_response


@router.post("/reset-password")
@limiter.limit("10/hour")
def reset_password(
    request: Request,
    data: PasswordReset,
    db: Session = Depends(get_db)
):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwörter stimmen nicht überein")
    if len(data.new_password) < 12:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 12 Zeichen haben")

    user = db.query(models.User).filter(models.User.reset_token == data.token).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Token ungültig oder abgelaufen")

    # DB speichert evtl. naive datetime (SQLite); als UTC interpretieren
    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token ungültig oder abgelaufen")

    user.password = auth.hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Passwort erfolgreich zurückgesetzt"}

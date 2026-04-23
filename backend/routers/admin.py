from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
from pydantic import BaseModel
from email_service import send_approved_email

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Nur Admins erlaubt")
    return current_user

class RoleUpdate(BaseModel):
    role: str

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_verified": u.is_verified,
            "avatar_url": u.avatar_url or "",
            "created_at": u.created_at.isoformat() + "Z"
        }
        for u in users
    ]

@router.patch("/users/{user_id}/role")
def update_role(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    if data.role not in ("guest", "member", "household", "admin"):
        raise HTTPException(status_code=400, detail="Ungültige Rolle")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Nutzer nicht gefunden")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Du kannst deine eigene Rolle nicht ändern")

    old_role = user.role
    user.role = data.role
    db.commit()

    if old_role == "guest" and data.role == "member":
        try:
            send_approved_email(user.email, user.name)
        except Exception as e:
            print(f"Email error: {e}")

    return {"message": f"Rolle auf {data.role} geändert"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Nutzer nicht gefunden")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst löschen")
    db.delete(user)
    db.commit()
    return {"message": "Nutzer gelöscht"}

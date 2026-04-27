from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database import get_db
from auth import require_admin
import models

router = APIRouter(prefix="/settings", tags=["settings"])


# ---------- Schemas ----------

class SettingValue(BaseModel):
    key: str
    value: str

class SettingUpdate(BaseModel):
    value: str = Field(max_length=5000)


# ---------- Whitelist erlaubter Keys ----------
# Verhindert, dass beliebige Keys angelegt werden können.
ALLOWED_KEYS = {
    "homepage_intro",
}


# ---------- Public: Lesen ----------

@router.get("/{key}", response_model=SettingValue)
def get_setting(key: str, db: Session = Depends(get_db)):
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=404, detail="Setting nicht gefunden")
    setting = db.query(models.SiteSetting).filter(models.SiteSetting.key == key).first()
    if not setting:
        # Falls noch nie gesetzt: leerer String (Frontend nutzt Fallback)
        return SettingValue(key=key, value="")
    return SettingValue(key=setting.key, value=setting.value)


# ---------- Admin: Schreiben ----------

@router.patch("/{key}", response_model=SettingValue)
def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=404, detail="Setting nicht erlaubt")

    setting = db.query(models.SiteSetting).filter(models.SiteSetting.key == key).first()
    if setting:
        setting.value = data.value
    else:
        setting = models.SiteSetting(key=key, value=data.value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return SettingValue(key=setting.key, value=setting.value)

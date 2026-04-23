"""Sicheres Handling von User-Image-Uploads."""
import os
import uuid
from io import BytesIO
from fastapi import HTTPException, UploadFile
from PIL import Image

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "GIF", "WEBP"}
EXT_BY_FORMAT = {
    "JPEG": "jpg",
    "PNG": "png",
    "GIF": "gif",
    "WEBP": "webp",
}


def save_image(file: UploadFile, upload_dir: str, prefix: str = "") -> str:
    """
    Validiert und speichert ein Bild. Liefert den generierten Dateinamen zurück.
    - Prüft Größe (max 5 MB).
    - Prüft, dass es ein echtes Bild ist (via Pillow).
    - Speichert mit zufälligem Namen — User-Filename wird ignoriert.
    - Re-kodiert das Bild → entfernt EXIF, potentielle Exploits im Container.
    """
    raw = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Bild zu groß (max 5 MB)")
    if not raw:
        raise HTTPException(status_code=400, detail="Leere Datei")

    try:
        img = Image.open(BytesIO(raw))
        img.verify()  # integrity check
        img = Image.open(BytesIO(raw))  # re-open nach verify
        fmt = img.format
    except Exception:
        raise HTTPException(status_code=400, detail="Ungültiges Bildformat")

    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Format {fmt} nicht erlaubt")

    ext = EXT_BY_FORMAT[fmt]
    filename = f"{prefix}{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    # Sicherstellen, dass filepath innerhalb von upload_dir liegt (Path-Traversal-Schutz)
    real_upload_dir = os.path.realpath(upload_dir)
    real_filepath = os.path.realpath(filepath)
    if not real_filepath.startswith(real_upload_dir + os.sep):
        raise HTTPException(status_code=400, detail="Ungültiger Pfad")

    # Re-kodieren & speichern (entfernt EXIF, normalisiert Format)
    save_kwargs = {}
    if fmt == "JPEG":
        # RGB erzwingen, falls CMYK/RGBA
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        save_kwargs = {"quality": 90, "optimize": True}

    img.save(filepath, format=fmt, **save_kwargs)
    return filename

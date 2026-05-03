"""Sicheres Handling von User-Image-Uploads."""
import os
import uuid
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "GIF", "WEBP"}
EXT_BY_FORMAT = {
    "JPEG": "jpg",
    "PNG": "png",
    "GIF": "gif",
    "WEBP": "webp",
}

# Diary-spezifisch: größeres Limit (15 MB), keine GIFs, WebP-Output
DIARY_MAX_IMAGE_BYTES = 15 * 1024 * 1024
DIARY_ALLOWED_INPUT_FORMATS = {"JPEG", "PNG", "WEBP"}
DIARY_FULL_MAX_DIM = 2000   # px lange Kante
DIARY_THUMB_MAX_DIM = 600   # px lange Kante
DIARY_FULL_QUALITY = 85
DIARY_THUMB_QUALITY = 80


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


def save_diary_image(file: UploadFile, upload_dir: str) -> tuple[str, str]:
    """
    Diary-spezifischer Upload: WebP-Output, Resize, mit Thumbnail.

    - Akzeptiert JPEG/PNG/WebP-Input (max. 15 MB)
    - Konvertiert immer nach WebP
    - Vollbild: max. 2000px lange Kante (Quality 85)
    - Thumbnail: max. 600px lange Kante (Quality 80) — separater File für Liste/Kalender
    - EXIF-Orientation wird angewandt (Smartphone-Fotos korrekt rotieren), dann gestripped
    - Liefert (full_filename, thumb_filename) zurück. Thumbnails landen im Subdir 'thumbs/'.
    - upload_dir sollte bereits existieren; thumbs/ wird ggf. angelegt.
    """
    raw = file.file.read(DIARY_MAX_IMAGE_BYTES + 1)
    if len(raw) > DIARY_MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Bild zu groß (max 15 MB)")
    if not raw:
        raise HTTPException(status_code=400, detail="Leere Datei")

    try:
        img = Image.open(BytesIO(raw))
        img.verify()
        img = Image.open(BytesIO(raw))
        fmt = img.format
    except Exception:
        raise HTTPException(status_code=400, detail="Ungültiges Bildformat")

    if fmt not in DIARY_ALLOWED_INPUT_FORMATS:
        raise HTTPException(status_code=400, detail=f"Format {fmt} nicht erlaubt")

    # EXIF-Orientation auf Pixel anwenden, dann ist das Bild "richtig herum" und EXIF kann weg
    img = ImageOps.exif_transpose(img)

    # WebP unterstützt RGB und RGBA, kein CMYK/L → normalisieren
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")

    # Path-Traversal-Schutz für upload_dir
    real_upload_dir = os.path.realpath(upload_dir)
    thumb_dir = os.path.join(upload_dir, "thumbs")
    os.makedirs(thumb_dir, exist_ok=True)

    base_name = uuid.uuid4().hex
    full_filename = f"{base_name}.webp"
    thumb_filename = f"{base_name}.webp"
    full_path = os.path.join(upload_dir, full_filename)
    thumb_path = os.path.join(thumb_dir, thumb_filename)

    # Path-Traversal-Verifikation für beide Files
    for p in (full_path, thumb_path):
        if not os.path.realpath(p).startswith(real_upload_dir + os.sep):
            raise HTTPException(status_code=400, detail="Ungültiger Pfad")

    # Vollbild: nur runterskalieren falls nötig (thumbnail() ändert in-place + behält aspect ratio)
    full_img = img.copy()
    full_img.thumbnail((DIARY_FULL_MAX_DIM, DIARY_FULL_MAX_DIM), Image.Resampling.LANCZOS)
    full_img.save(full_path, format="WEBP", quality=DIARY_FULL_QUALITY, method=6)

    # Thumbnail
    thumb_img = img.copy()
    thumb_img.thumbnail((DIARY_THUMB_MAX_DIM, DIARY_THUMB_MAX_DIM), Image.Resampling.LANCZOS)
    thumb_img.save(thumb_path, format="WEBP", quality=DIARY_THUMB_QUALITY, method=6)

    return full_filename, thumb_filename

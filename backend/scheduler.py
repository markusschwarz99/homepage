"""
In-Prozess-Scheduler für den Einkaufslisten-Digest.

Startet als asyncio-Task in der FastAPI-lifespan (siehe main.py). Der eigentliche
Check läuft synchron (SQLAlchemy + Resend-HTTP) und wird deshalb über
asyncio.to_thread ausgelagert, damit der Event-Loop nicht blockiert.
"""
import asyncio
import logging
import os

from database import SessionLocal
from shopping_digest import run_shopping_digest

logger = logging.getLogger("uvicorn")

INTERVAL_SECONDS = int(os.getenv("SHOPPING_DIGEST_INTERVAL_SECONDS", "900"))


def _run_once():
    db = SessionLocal()
    try:
        run_shopping_digest(db)
    except Exception:
        db.rollback()
        logger.exception("Einkaufslisten-Digest: Tick fehlgeschlagen")
    finally:
        db.close()


async def shopping_digest_loop():
    logger.info(
        "Einkaufslisten-Digest-Loop gestartet (Intervall: %ds)", INTERVAL_SECONDS
    )
    while True:
        await asyncio.sleep(INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(_run_once)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Einkaufslisten-Digest: Loop-Fehler")

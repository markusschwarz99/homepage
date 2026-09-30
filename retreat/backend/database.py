import os

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("RETREAT_DATABASE_URL", "sqlite:////data/retreat.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


# SQLite setzt Fremdschlüssel nur mit diesem Pragma durch (sonst kein
# ON DELETE CASCADE -> verwaiste event_participants-Zeilen).
@event.listens_for(Engine, "connect")
def _sqlite_foreign_keys(dbapi_connection, _record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

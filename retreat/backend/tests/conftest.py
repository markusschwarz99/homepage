import os
import sys
from pathlib import Path

os.environ["RETREAT_DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db
from main import app
from schemas import Seed
from scripts.retreat_data import load_seed

SEED_FILE = Path(__file__).parent.parent / "seed.example.json"


@pytest.fixture
def seed() -> Seed:
    return Seed.model_validate_json(SEED_FILE.read_text())


@pytest.fixture
def db(seed):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    load_seed(session, seed)
    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def person(db, key: str) -> models.Person:
    return db.query(models.Person).filter(models.Person.key == key).one()


def headers(db, key: str) -> dict:
    return {"Authorization": f"Bearer {person(db, key).token}"}


def car(db, key: str) -> models.Car:
    return db.query(models.Car).filter(models.Car.key == key).one()


def apartment(db, key: str) -> models.Apartment:
    return db.query(models.Apartment).filter(models.Apartment.key == key).one()

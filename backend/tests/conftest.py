import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

os.environ["JWT_SECRET"] = "test-secret-key-only-for-testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["RESEND_API_KEY"] = "test-key"
os.environ["UPLOAD_DIR"] = "/tmp/test_uploads"

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Wichtig: email_service mocken BEVOR main importiert wird
import email_service
email_service.send_verification_email = MagicMock(return_value=None)
email_service.send_approved_email = MagicMock(return_value=None)
email_service.send_password_reset_email = MagicMock(return_value=None)

from main import app
from database import Base, get_db
import models
from auth import hash_password, create_token

# Rate-Limiter für Tests deaktivieren
from rate_limit import limiter
limiter.enabled = False


@pytest.fixture(scope="function")
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_engine, db_session):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    user = models.User(
        name="Test User",
        email="test@example.com",
        password=hash_password("TestPassword123!"),
        role="member",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def guest_user(db_session):
    user = models.User(
        name="Guest User",
        email="guest@example.com",
        password=hash_password("GuestPassword123!"),
        role="guest",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def household_user(db_session):
    user = models.User(
        name="Household User",
        email="household@example.com",
        password=hash_password("HouseholdPass123!"),
        role="household",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    user = models.User(
        name="Admin User",
        email="admin@example.com",
        password=hash_password("AdminPassword123!"),
        role="admin",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# WICHTIG: Token nutzt email als "sub", passend zum login()-Code
def _token_for(user):
    return create_token({"sub": user.email})


@pytest.fixture
def auth_headers(test_user):
    return {"Authorization": f"Bearer {_token_for(test_user)}"}


@pytest.fixture
def admin_headers(admin_user):
    return {"Authorization": f"Bearer {_token_for(admin_user)}"}


@pytest.fixture
def guest_headers(guest_user):
    return {"Authorization": f"Bearer {_token_for(guest_user)}"}


@pytest.fixture
def household_headers(household_user):
    return {"Authorization": f"Bearer {_token_for(household_user)}"}


# ---------- Shared Test-Daten ----------

@pytest.fixture
def blog_post(db_session, admin_user):
    """Ein Blog-Post, erstellt vom Admin."""
    post = models.BlogPost(
        title="Test Post",
        content="<p>Hello World</p>",
        author_id=admin_user.id,
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)
    return post


@pytest.fixture
def tag_category(db_session):
    cat = models.TagCategory(name="Kategorie", position=0)
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


@pytest.fixture
def tag(db_session, tag_category):
    t = models.Tag(category_id=tag_category.id, name="Vegetarisch", position=0)
    db_session.add(t)
    db_session.commit()
    db_session.refresh(t)
    return t


@pytest.fixture
def recipe(db_session, test_user):
    r = models.Recipe(
        title="Test Rezept",
        servings=4,
        servings_unit="Portionen",
        author_id=test_user.id,
    )
    db_session.add(r)
    db_session.flush()
    r.ingredients.append(models.RecipeIngredient(
        position=0, amount=200, unit="g", name="Mehl"
    ))
    r.steps.append(models.RecipeStep(position=0, content="Mehl abwiegen"))
    db_session.commit()
    db_session.refresh(r)
    return r

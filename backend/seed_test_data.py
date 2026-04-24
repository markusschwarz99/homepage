"""Seed-Script für E2E-Tests. Legt Test-User an.
Nur in Test-Umgebung ausführen!
"""
import os
import sys

if os.getenv("ENVIRONMENT") != "test":
    print("FEHLER: Nur in Test-Umgebung erlaubt (ENVIRONMENT=test)")
    sys.exit(1)

from database import Base, engine, SessionLocal
import models
from auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

TEST_USERS = [
    {"name": "Test Admin", "email": "admin@test.local", "password": "TestAdminPass123!", "role": "admin"},
    {"name": "Test Member", "email": "member@test.local", "password": "TestMemberPass123!", "role": "member"},
    {"name": "Test Household", "email": "household@test.local", "password": "TestHouseholdPass123!", "role": "household"},
    {"name": "Test Guest", "email": "guest@test.local", "password": "TestGuestPass123!", "role": "guest"},
]

for u in TEST_USERS:
    existing = db.query(models.User).filter(models.User.email == u["email"]).first()
    if existing:
        print(f"User {u['email']} existiert bereits, überspringe")
        continue
    user = models.User(
        name=u["name"],
        email=u["email"],
        password=hash_password(u["password"]),
        role=u["role"],
        is_verified=True,
    )
    db.add(user)
    print(f"User {u['email']} ({u['role']}) angelegt")

db.commit()
db.close()
print("Seed abgeschlossen")

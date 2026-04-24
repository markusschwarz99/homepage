import os
from auth import hash_password, verify_password, create_token
from jose import jwt
import models


# ========== Unit Tests: Password Hashing ==========

class TestPasswordHashing:
    def test_hash_password_returns_string(self):
        hashed = hash_password("MyPassword123")
        assert isinstance(hashed, str)
        assert hashed != "MyPassword123"

    def test_hash_password_is_unique_each_time(self):
        assert hash_password("MyPassword123") != hash_password("MyPassword123")

    def test_verify_password_correct(self):
        hashed = hash_password("MyPassword123")
        assert verify_password("MyPassword123", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("MyPassword123")
        assert verify_password("WrongPassword", hashed) is False


# ========== Unit Tests: JWT ==========

class TestTokenCreation:
    def test_create_token_returns_valid_jwt(self):
        token = create_token({"sub": "user@example.com"})
        decoded = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        assert decoded["sub"] == "user@example.com"
        assert "exp" in decoded


# ========== Unit Tests: User Model ==========

class TestUserModel:
    def test_admin_properties(self, admin_user):
        assert admin_user.is_admin is True
        assert admin_user.is_household is True
        assert admin_user.is_member is True

    def test_household_properties(self, household_user):
        assert household_user.is_admin is False
        assert household_user.is_household is True
        assert household_user.is_member is True

    def test_member_properties(self, test_user):
        assert test_user.is_admin is False
        assert test_user.is_household is False
        assert test_user.is_member is True

    def test_guest_properties(self, guest_user):
        assert guest_user.is_admin is False
        assert guest_user.is_household is False
        assert guest_user.is_member is False


# ========== Integration: /auth/register ==========

class TestRegister:
    def test_register_success(self, client):
        response = client.post("/auth/register", json={
            "name": "New User",
            "email": "new@example.com",
            "password": "SecurePassword123!",
        })
        assert response.status_code == 200
        assert "message" in response.json()

    def test_register_creates_guest_user(self, client, db_session):
        client.post("/auth/register", json={
            "name": "New User",
            "email": "new@example.com",
            "password": "SecurePassword123!",
        })
        user = db_session.query(models.User).filter_by(email="new@example.com").first()
        assert user is not None
        assert user.role == "guest"
        assert user.is_verified is False
        assert user.verification_token is not None

    def test_register_short_password_rejected(self, client):
        response = client.post("/auth/register", json={
            "name": "New User",
            "email": "new@example.com",
            "password": "short",
        })
        assert response.status_code == 400

    def test_register_duplicate_email(self, client, test_user):
        response = client.post("/auth/register", json={
            "name": "Someone Else",
            "email": test_user.email,
            "password": "SecurePassword123!",
        })
        assert response.status_code == 400

    def test_register_email_normalized(self, client, db_session):
        """Email wird lowercase + gestrippt gespeichert."""
        client.post("/auth/register", json={
            "name": "Mixed Case",
            "email": "  MIXED@Example.COM  ",
            "password": "SecurePassword123!",
        })
        user = db_session.query(models.User).filter_by(email="mixed@example.com").first()
        assert user is not None

    def test_register_password_is_hashed(self, client, db_session):
        plain = "SecurePassword123!"
        client.post("/auth/register", json={
            "name": "Hash Test",
            "email": "hash@example.com",
            "password": plain,
        })
        user = db_session.query(models.User).filter_by(email="hash@example.com").first()
        assert user.password != plain
        assert verify_password(plain, user.password)


# ========== Integration: /auth/verify ==========

class TestVerify:
    def test_verify_with_valid_token(self, client, db_session):
        client.post("/auth/register", json={
            "name": "To Verify",
            "email": "verify@example.com",
            "password": "SecurePassword123!",
        })
        user = db_session.query(models.User).filter_by(email="verify@example.com").first()
        token = user.verification_token

        response = client.get(f"/auth/verify?token={token}")
        assert response.status_code == 200

        db_session.refresh(user)
        assert user.is_verified is True
        assert user.verification_token is None

    def test_verify_with_invalid_token(self, client):
        response = client.get("/auth/verify?token=invalid-token")
        assert response.status_code == 400


# ========== Integration: /auth/login ==========

class TestLogin:
    def test_login_success(self, client, test_user):
        response = client.post("/auth/login", data={
            "username": test_user.email,
            "password": "TestPassword123!",
        })
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        response = client.post("/auth/login", data={
            "username": test_user.email,
            "password": "WrongPassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/auth/login", data={
            "username": "ghost@example.com",
            "password": "anything",
        })
        assert response.status_code == 401

    def test_login_unverified_user(self, client, db_session):
        user = models.User(
            name="Unverified",
            email="unverified@example.com",
            password=hash_password("SomePassword123!"),
            role="guest",
            is_verified=False,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post("/auth/login", data={
            "username": user.email,
            "password": "SomePassword123!",
        })
        assert response.status_code == 401

    def test_login_case_insensitive_email(self, client, test_user):
        response = client.post("/auth/login", data={
            "username": test_user.email.upper(),
            "password": "TestPassword123!",
        })
        assert response.status_code == 200


# ========== Integration: /auth/me ==========

class TestMe:
    def test_me_returns_current_user(self, client, test_user, auth_headers):
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["email"] == test_user.email
        assert body["name"] == test_user.name
        assert body["role"] == "member"
        assert body["is_member"] is True
        assert body["is_admin"] is False

    def test_me_without_auth(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self, client):
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401

    def test_update_name(self, client, test_user, auth_headers, db_session):
        response = client.patch(
            "/auth/me",
            headers=auth_headers,
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        db_session.refresh(test_user)
        assert test_user.name == "Updated Name"


# ========== Integration: /auth/me/password ==========

class TestPasswordChange:
    def test_change_password_success(self, client, test_user, auth_headers, db_session):
        response = client.post(
            "/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "TestPassword123!",
                "new_password": "NewSecurePass456!",
                "confirm_password": "NewSecurePass456!",
            },
        )
        assert response.status_code == 200
        db_session.refresh(test_user)
        assert verify_password("NewSecurePass456!", test_user.password)

    def test_change_password_wrong_current(self, client, auth_headers):
        response = client.post(
            "/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "WrongCurrent",
                "new_password": "NewSecurePass456!",
                "confirm_password": "NewSecurePass456!",
            },
        )
        assert response.status_code == 400

    def test_change_password_mismatch(self, client, auth_headers):
        response = client.post(
            "/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "TestPassword123!",
                "new_password": "NewSecurePass456!",
                "confirm_password": "Different123456!",
            },
        )
        assert response.status_code == 400

    def test_change_password_too_short(self, client, auth_headers):
        response = client.post(
            "/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "TestPassword123!",
                "new_password": "short",
                "confirm_password": "short",
            },
        )
        assert response.status_code == 400


# ========== Integration: Password Reset ==========

class TestPasswordReset:
    def test_request_reset_existing_user(self, client, test_user, db_session):
        response = client.post(
            "/auth/request-password-reset",
            json={"email": test_user.email},
        )
        assert response.status_code == 200
        db_session.refresh(test_user)
        assert test_user.reset_token is not None
        assert test_user.reset_token_expires is not None

    def test_request_reset_nonexistent_user_generic_response(self, client):
        """Anti-Enumeration: gleiche Antwort wie bei existierenden Usern."""
        response = client.post(
            "/auth/request-password-reset",
            json={"email": "ghost@example.com"},
        )
        assert response.status_code == 200

    def test_reset_with_valid_token(self, client, test_user, db_session):
        client.post("/auth/request-password-reset", json={"email": test_user.email})
        db_session.refresh(test_user)
        token = test_user.reset_token

        response = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "BrandNewPass789!",
            "confirm_password": "BrandNewPass789!",
        })
        assert response.status_code == 200

        db_session.refresh(test_user)
        assert verify_password("BrandNewPass789!", test_user.password)
        assert test_user.reset_token is None

    def test_reset_with_invalid_token(self, client):
        response = client.post("/auth/reset-password", json={
            "token": "invalid-token",
            "new_password": "BrandNewPass789!",
            "confirm_password": "BrandNewPass789!",
        })
        assert response.status_code == 400

    def test_reset_password_mismatch(self, client, test_user, db_session):
        client.post("/auth/request-password-reset", json={"email": test_user.email})
        db_session.refresh(test_user)

        response = client.post("/auth/reset-password", json={
            "token": test_user.reset_token,
            "new_password": "BrandNewPass789!",
            "confirm_password": "DifferentPass789!",
        })
        assert response.status_code == 400

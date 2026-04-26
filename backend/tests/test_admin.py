import models


class TestListUsers:
    def test_admin_lists_users(self, client, admin_headers, test_user, guest_user):
        response = client.get("/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # admin_user + test_user + guest_user = 3
        assert len(data) >= 3
        emails = [u["email"] for u in data]
        assert "test@example.com" in emails
        assert "guest@example.com" in emails
        assert "admin@example.com" in emails

    def test_user_response_shape(self, client, admin_headers, test_user):
        response = client.get("/admin/users", headers=admin_headers)
        assert response.status_code == 200
        user = next(u for u in response.json() if u["email"] == "test@example.com")
        assert "id" in user
        assert "name" in user
        assert "role" in user
        assert "is_verified" in user
        assert "avatar_url" in user
        assert "created_at" in user
        assert user["created_at"].endswith("Z")
        assert "last_login" in user
        assert user["last_login"] is None

    def test_member_forbidden(self, client, auth_headers):
        response = client.get("/admin/users", headers=auth_headers)
        assert response.status_code == 403

    def test_guest_forbidden(self, client, guest_headers):
        response = client.get("/admin/users", headers=guest_headers)
        assert response.status_code == 403

    def test_unauthenticated(self, client):
        response = client.get("/admin/users")
        assert response.status_code == 401


class TestUpdateRole:
    def test_admin_promotes_guest_to_member(self, client, admin_headers, guest_user, db_session):
        response = client.patch(
            f"/admin/users/{guest_user.id}/role",
            headers=admin_headers,
            json={"role": "member"},
        )
        assert response.status_code == 200
        db_session.refresh(guest_user)
        assert guest_user.role == "member"

    def test_promotion_sends_approved_email(self, client, admin_headers, guest_user):
        import email_service
        email_service.send_approved_email.reset_mock()

        response = client.patch(
            f"/admin/users/{guest_user.id}/role",
            headers=admin_headers,
            json={"role": "member"},
        )
        assert response.status_code == 200
        email_service.send_approved_email.assert_called_once_with(
            guest_user.email, guest_user.name
        )

    def test_no_email_for_other_role_changes(self, client, admin_headers, test_user):
        """member → household soll KEINE approved-Mail senden."""
        import email_service
        email_service.send_approved_email.reset_mock()

        response = client.patch(
            f"/admin/users/{test_user.id}/role",
            headers=admin_headers,
            json={"role": "household"},
        )
        assert response.status_code == 200
        email_service.send_approved_email.assert_not_called()

    def test_change_to_admin(self, client, admin_headers, test_user, db_session):
        response = client.patch(
            f"/admin/users/{test_user.id}/role",
            headers=admin_headers,
            json={"role": "admin"},
        )
        assert response.status_code == 200
        db_session.refresh(test_user)
        assert test_user.role == "admin"

    def test_invalid_role_rejected(self, client, admin_headers, test_user):
        response = client.patch(
            f"/admin/users/{test_user.id}/role",
            headers=admin_headers,
            json={"role": "superuser"},
        )
        assert response.status_code == 400

    def test_nonexistent_user(self, client, admin_headers):
        response = client.patch(
            "/admin/users/99999/role",
            headers=admin_headers,
            json={"role": "member"},
        )
        assert response.status_code == 404

    def test_admin_cannot_change_own_role(self, client, admin_headers, admin_user):
        response = client.patch(
            f"/admin/users/{admin_user.id}/role",
            headers=admin_headers,
            json={"role": "member"},
        )
        assert response.status_code == 400

    def test_member_cannot_update_role(self, client, auth_headers, guest_user):
        response = client.patch(
            f"/admin/users/{guest_user.id}/role",
            headers=auth_headers,
            json={"role": "member"},
        )
        assert response.status_code == 403


class TestDeleteUser:
    def test_admin_deletes_user(self, client, admin_headers, guest_user, db_session):
        user_id = guest_user.id
        response = client.delete(f"/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 200
        assert db_session.query(models.User).filter_by(id=user_id).first() is None

    def test_delete_nonexistent_user(self, client, admin_headers):
        response = client.delete("/admin/users/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_admin_cannot_delete_self(self, client, admin_headers, admin_user, db_session):
        response = client.delete(f"/admin/users/{admin_user.id}", headers=admin_headers)
        assert response.status_code == 400
        # User muss noch existieren
        assert db_session.query(models.User).filter_by(id=admin_user.id).first() is not None

    def test_member_cannot_delete(self, client, auth_headers, guest_user):
        response = client.delete(f"/admin/users/{guest_user.id}", headers=auth_headers)
        assert response.status_code == 403

    def test_unauthenticated_cannot_delete(self, client, guest_user):
        response = client.delete(f"/admin/users/{guest_user.id}")
        assert response.status_code == 401

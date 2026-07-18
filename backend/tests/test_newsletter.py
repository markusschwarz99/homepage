import email_service


class TestSendNewsletter:
    def _payload(self, **overrides):
        payload = {
            "subject": "Neuigkeiten",
            "body": "Hallo!\nEs gibt neue Rezepte.",
            "recipe_ids": [],
            "user_ids": [],
            "roles": ["household"],
        }
        payload.update(overrides)
        return payload

    def test_member_cannot_send(self, client, auth_headers):
        response = client.post(
            "/newsletter/send", headers=auth_headers, json=self._payload()
        )
        assert response.status_code == 403

    def test_household_cannot_send(self, client, household_headers):
        response = client.post(
            "/newsletter/send", headers=household_headers, json=self._payload()
        )
        assert response.status_code == 403

    def test_invalid_role_rejected(self, client, admin_headers):
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(roles=["superuser"]),
        )
        assert response.status_code == 400

    def test_blank_subject_rejected(self, client, admin_headers):
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(subject="   "),
        )
        assert response.status_code == 400

    def test_no_recipients_rejected(self, client, admin_headers):
        # Keine Rollen, keine user_ids
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(roles=[]),
        )
        assert response.status_code == 400

    def test_unknown_recipe_rejected(self, client, admin_headers, admin_user):
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(roles=["admin"], recipe_ids=[9999]),
        )
        assert response.status_code == 404

    def test_send_to_role_group(self, client, admin_headers, household_user, test_user):
        email_service.send_newsletter_email.reset_mock()
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(roles=["household"]),
        )
        assert response.status_code == 200
        assert response.json() == {"sent": 1, "failed": 0}
        email_service.send_newsletter_email.assert_called_once()
        args = email_service.send_newsletter_email.call_args.args
        assert args[0] == household_user.email
        assert args[2] == "Neuigkeiten"

    def test_role_and_user_ids_deduplicated(
        self, client, admin_headers, household_user, test_user
    ):
        # household_user ist über Rolle UND user_id ausgewählt → nur 1 Mail;
        # test_user (member) zusätzlich über user_id → insgesamt 2
        email_service.send_newsletter_email.reset_mock()
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(
                roles=["household"],
                user_ids=[household_user.id, test_user.id],
            ),
        )
        assert response.status_code == 200
        assert response.json()["sent"] == 2
        assert email_service.send_newsletter_email.call_count == 2
        sent_to = {c.args[0] for c in email_service.send_newsletter_email.call_args_list}
        assert sent_to == {household_user.email, test_user.email}

    def test_send_with_recipes(self, client, admin_headers, admin_user, recipe):
        email_service.send_newsletter_email.reset_mock()
        response = client.post(
            "/newsletter/send",
            headers=admin_headers,
            json=self._payload(roles=["admin"], recipe_ids=[recipe.id]),
        )
        assert response.status_code == 200
        assert response.json()["sent"] == 1
        recipes_arg = email_service.send_newsletter_email.call_args.args[4]
        assert recipes_arg == [
            {"id": recipe.id, "title": "Test Rezept", "image_url": None}
        ]

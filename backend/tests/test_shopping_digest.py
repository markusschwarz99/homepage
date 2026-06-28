from datetime import datetime, timedelta

import email_service
import models
from shopping_digest import run_shopping_digest, WATERMARK_KEY


# ---------- Helpers ----------

def _add_item(db, name, added_at, quantity="1", description=None, user=None):
    item = models.ShoppingItem(
        name=name,
        quantity=quantity,
        description=description,
        added_by_id=user.id if user else None,
        added_at=added_at,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _set_watermark(db, dt):
    db.add(models.SiteSetting(key=WATERMARK_KEY, value=dt.isoformat()))
    db.commit()


def _watermark(db):
    s = (
        db.query(models.SiteSetting)
        .filter(models.SiteSetting.key == WATERMARK_KEY)
        .first()
    )
    return s.value if s else None


# ---------- Erster Lauf (Baseline, kein Versand) ----------

class TestFirstRun:
    def test_no_items_sets_sentinel_no_mail(self, db_session):
        email_service.send_shopping_list_digest.reset_mock()
        assert run_shopping_digest(db_session) is False
        email_service.send_shopping_list_digest.assert_not_called()
        # Watermark wurde gesetzt (Sentinel), damit der nächste Artikel als neu gilt
        assert _watermark(db_session) is not None

    def test_existing_items_baseline_no_mail(self, db_session, household_user):
        email_service.send_shopping_list_digest.reset_mock()
        newest = datetime(2026, 1, 1, 12, 0, 0)
        _add_item(db_session, "Milch", newest - timedelta(hours=1), user=household_user)
        _add_item(db_session, "Brot", newest, user=household_user)

        assert run_shopping_digest(db_session) is False
        email_service.send_shopping_list_digest.assert_not_called()
        # Watermark == neuestes vorhandenes added_at
        assert _watermark(db_session) == newest.isoformat()


# ---------- Versand bei neuen Artikeln ----------

class TestDigestSend:
    def test_new_item_sends_to_household_and_admin_only(
        self, db_session, household_user, admin_user, test_user, guest_user
    ):
        email_service.send_shopping_list_digest.reset_mock()
        base = datetime(2026, 1, 1, 12, 0, 0)
        _set_watermark(db_session, base)
        _add_item(db_session, "Brot", base + timedelta(minutes=5), user=household_user)

        assert run_shopping_digest(db_session) is True
        # household + admin = 2 Empfänger; member/guest bekommen nichts
        assert email_service.send_shopping_list_digest.call_count == 2
        recipients = {
            c.args[0] for c in email_service.send_shopping_list_digest.call_args_list
        }
        assert recipients == {household_user.email, admin_user.email}

    def test_mail_contains_new_and_full_list(self, db_session, household_user):
        email_service.send_shopping_list_digest.reset_mock()
        base = datetime(2026, 1, 1, 12, 0, 0)
        _add_item(db_session, "Milch", base - timedelta(minutes=10), user=household_user)
        _set_watermark(db_session, base)
        _add_item(db_session, "Brot", base + timedelta(minutes=5), user=household_user)

        assert run_shopping_digest(db_session) is True
        args = email_service.send_shopping_list_digest.call_args.args
        new_items, all_items = args[2], args[3]
        assert [i["name"] for i in new_items] == ["Brot"]
        assert {i["name"] for i in all_items} == {"Milch", "Brot"}

    def test_watermark_advances_and_no_double_send(self, db_session, household_user):
        email_service.send_shopping_list_digest.reset_mock()
        base = datetime(2026, 1, 1, 12, 0, 0)
        _set_watermark(db_session, base)
        new_at = base + timedelta(minutes=5)
        _add_item(db_session, "Brot", new_at, user=household_user)

        assert run_shopping_digest(db_session) is True
        assert _watermark(db_session) == new_at.isoformat()

        # Zweiter Lauf ohne neue Artikel → keine weitere Mail
        email_service.send_shopping_list_digest.reset_mock()
        assert run_shopping_digest(db_session) is False
        email_service.send_shopping_list_digest.assert_not_called()

    def test_no_new_items_no_mail(self, db_session, household_user):
        email_service.send_shopping_list_digest.reset_mock()
        base = datetime(2026, 1, 1, 12, 0, 0)
        _add_item(db_session, "Milch", base - timedelta(minutes=10), user=household_user)
        _set_watermark(db_session, base)

        assert run_shopping_digest(db_session) is False
        email_service.send_shopping_list_digest.assert_not_called()

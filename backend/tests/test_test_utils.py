"""
Tests für den test_utils Router.
Dieser Router wird in main.py nur bei ENVIRONMENT=test registriert,
aber in der Test-Suite registrieren wir ihn manuell, um seine Logik zu testen.
"""
import os
import subprocess
import sys
import pytest
import models


@pytest.fixture
def test_router_app(client):
    """Registriert den test_utils Router in der App, falls nicht schon drin."""
    os.environ["ENVIRONMENT"] = "test"
    from routers import test_utils
    from main import app

    existing = [r for r in app.router.routes if getattr(r, "path", "").startswith("/test")]
    if not existing:
        app.include_router(test_utils.router)

    yield client


class TestCleanupRecipes:
    def test_deletes_all_recipes(self, test_router_app, db_session, test_user):
        for i in range(3):
            r = models.Recipe(
                title=f"Rezept {i}",
                servings=4,
                servings_unit="Portionen",
                author_id=test_user.id,
            )
            db_session.add(r)
        db_session.commit()
        assert db_session.query(models.Recipe).count() == 3

        response = test_router_app.post("/test/cleanup/recipes")
        assert response.status_code == 200
        assert response.json()["deleted_recipes"] == 3
        assert db_session.query(models.Recipe).count() == 0

    def test_empty_db(self, test_router_app):
        response = test_router_app.post("/test/cleanup/recipes")
        assert response.status_code == 200
        assert response.json()["deleted_recipes"] == 0


class TestCleanupTags:
    def test_deletes_categories_and_tags(self, test_router_app, db_session, tag_category, tag):
        assert db_session.query(models.TagCategory).count() == 1
        assert db_session.query(models.Tag).count() == 1

        response = test_router_app.post("/test/cleanup/tags")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted_categories"] == 1
        assert data["deleted_tags"] == 1
        assert db_session.query(models.TagCategory).count() == 0
        assert db_session.query(models.Tag).count() == 0


class TestCleanupBlog:
    def test_deletes_posts(self, test_router_app, db_session, blog_post):
        assert db_session.query(models.BlogPost).count() == 1

        response = test_router_app.post("/test/cleanup/blog")
        assert response.status_code == 200
        assert response.json()["deleted_posts"] == 1
        assert db_session.query(models.BlogPost).count() == 0


class TestCleanupAll:
    def test_deletes_all_except_users(self, test_router_app, db_session, test_user, recipe, blog_post, tag_category, tag):
        user_count_before = db_session.query(models.User).count()

        response = test_router_app.post("/test/cleanup/all")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted_recipes"] >= 1
        assert data["deleted_posts"] >= 1
        assert data["deleted_categories"] >= 1
        assert data["deleted_tags"] >= 1

        assert db_session.query(models.User).count() == user_count_before
        assert db_session.query(models.Recipe).count() == 0
        assert db_session.query(models.BlogPost).count() == 0
        assert db_session.query(models.TagCategory).count() == 0
        assert db_session.query(models.Tag).count() == 0


class TestImportSafety:
    def test_import_fails_without_env(self):
        """
        Stellt sicher, dass test_utils ohne ENVIRONMENT=test einen RuntimeError wirft.
        Wir verwenden einen Subprozess mit frischem Python-Interpreter, damit
        sys.modules-Caches uns nicht in die Quere kommen.
        """
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import os; os.environ.pop('ENVIRONMENT', None); "
                "from routers import test_utils",
            ],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert result.returncode != 0, "Import sollte fehlschlagen"
        assert "ENVIRONMENT=test" in result.stderr, (
            f"Erwartete RuntimeError-Message nicht gefunden. stderr:\n{result.stderr}"
        )

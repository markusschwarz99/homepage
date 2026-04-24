import models


class TestListPosts:
    def test_admin_can_list(self, client, admin_headers, blog_post):
        response = client.get("/blog/posts", headers=admin_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_member_cannot_list(self, client, auth_headers):
        # Blog ist Admin-only laut blog.py
        response = client.get("/blog/posts", headers=auth_headers)
        assert response.status_code == 403

    def test_guest_cannot_list(self, client, guest_headers):
        response = client.get("/blog/posts", headers=guest_headers)
        assert response.status_code == 403

    def test_unauthenticated_cannot_list(self, client):
        response = client.get("/blog/posts")
        assert response.status_code == 401


class TestGetPost:
    def test_admin_gets_post(self, client, admin_headers, blog_post):
        response = client.get(f"/blog/posts/{blog_post.id}", headers=admin_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "Test Post"
        assert "author_name" in body

    def test_get_nonexistent(self, client, admin_headers):
        response = client.get("/blog/posts/99999", headers=admin_headers)
        assert response.status_code == 404


class TestCreatePost:
    def test_admin_creates_post(self, client, admin_headers, db_session):
        response = client.post(
            "/blog/posts",
            headers=admin_headers,
            json={"title": "Neu", "content": "<p>Content</p>"},
        )
        assert response.status_code == 200
        post_id = response.json()["id"]
        post = db_session.query(models.BlogPost).filter_by(id=post_id).first()
        assert post is not None
        assert post.title == "Neu"

    def test_member_cannot_create(self, client, auth_headers):
        response = client.post(
            "/blog/posts",
            headers=auth_headers,
            json={"title": "x", "content": "y"},
        )
        assert response.status_code == 403


class TestUpdatePost:
    def test_admin_updates(self, client, admin_headers, blog_post, db_session):
        response = client.patch(
            f"/blog/posts/{blog_post.id}",
            headers=admin_headers,
            json={"title": "Updated", "content": "<p>New</p>"},
        )
        assert response.status_code == 200
        db_session.refresh(blog_post)
        assert blog_post.title == "Updated"

    def test_update_nonexistent(self, client, admin_headers):
        response = client.patch(
            "/blog/posts/99999",
            headers=admin_headers,
            json={"title": "x", "content": "y"},
        )
        assert response.status_code == 404


class TestDeletePost:
    def test_admin_deletes(self, client, admin_headers, blog_post, db_session):
        response = client.delete(
            f"/blog/posts/{blog_post.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert db_session.query(models.BlogPost).filter_by(id=blog_post.id).first() is None

    def test_member_cannot_delete(self, client, auth_headers, blog_post):
        response = client.delete(
            f"/blog/posts/{blog_post.id}",
            headers=auth_headers,
        )
        assert response.status_code == 403

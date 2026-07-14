"""
Unit tests for authentication helpers and auth API routes.
All tests run against an in-memory SQLite database — no MySQL, no S3, no SMTP.
"""

import pytest
from app.security.auth import hash_password, verify_password, create_access_token, verify_token


# ── Pure unit tests: security helpers ───────────────────────────────────────

class TestPasswordHashing:

    def test_hash_returns_string(self):
        hashed = hash_password("mysecretpassword")
        assert isinstance(hashed, str)

    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correct-password")
        assert verify_password("correct-password", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct-password")
        assert verify_password("wrong-password", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt uses a random salt — same input should never produce same hash."""
        h1 = hash_password("same-password")
        h2 = hash_password("same-password")
        assert h1 != h2


class TestJWT:

    def test_create_and_verify_token(self):
        token = create_access_token({"sub": "testuser"})
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "testuser"

    def test_verify_invalid_token_returns_none(self):
        result = verify_token("this.is.not.a.valid.token")
        assert result is None

    def test_verify_tampered_token_returns_none(self):
        token = create_access_token({"sub": "testuser"})
        tampered = token[:-5] + "XXXXX"
        assert verify_token(tampered) is None

    def test_token_contains_expiry(self):
        token = create_access_token({"sub": "testuser"})
        payload = verify_token(token)
        assert "exp" in payload


# ── Integration tests: API routes (TestClient + SQLite) ─────────────────────

class TestHealthEndpoints:

    def test_root_returns_200(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert "message" in res.json()

    def test_health_returns_healthy(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"


class TestRegister:

    def test_register_new_user(self, client):
        res = client.post("/auth/register", json={
            "username": "alice",
            "email":    "alice@example.com",
            "password": "SecurePass123"
        })
        assert res.status_code == 200
        assert res.json()["message"] == "User registered successfully"

    def test_register_duplicate_email(self, client):
        payload = {
            "username": "bob",
            "email":    "bob@example.com",
            "password": "SecurePass123"
        }
        client.post("/auth/register", json=payload)
        # second registration with same email
        res = client.post("/auth/register", json={
            "username": "bob2",
            "email":    "bob@example.com",
            "password": "AnotherPass456"
        })
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"]

    def test_register_missing_fields(self, client):
        res = client.post("/auth/register", json={"username": "charlie"})
        assert res.status_code == 422   # Unprocessable Entity


class TestLogin:

    def test_login_valid_credentials(self, client):
        # register first
        client.post("/auth/register", json={
            "username": "dave",
            "email":    "dave@example.com",
            "password": "DavePass789"
        })
        res = client.post(
            "/auth/login",
            data={"username": "dave", "password": "DavePass789"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        client.post("/auth/register", json={
            "username": "eve",
            "email":    "eve@example.com",
            "password": "EvePass000"
        })
        res = client.post(
            "/auth/login",
            data={"username": "eve", "password": "WrongPassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = client.post(
            "/auth/login",
            data={"username": "ghost", "password": "NoUser123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert res.status_code == 401

    def test_login_returns_valid_jwt(self, client):
        client.post("/auth/register", json={
            "username": "frank",
            "email":    "frank@example.com",
            "password": "FrankPass111"
        })
        res = client.post(
            "/auth/login",
            data={"username": "frank", "password": "FrankPass111"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = res.json()["access_token"]
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "frank"


class TestMeEndpoint:

    def _register_and_login(self, client, username, email, password):
        client.post("/auth/register", json={
            "username": username,
            "email":    email,
            "password": password
        })
        res = client.post(
            "/auth/login",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return res.json()["access_token"]

    def test_me_returns_user_info(self, client):
        token = self._register_and_login(client, "grace", "grace@example.com", "GracePass222")
        res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["username"] == "grace"
        assert body["email"] == "grace@example.com"

    def test_me_without_token_returns_401(self, client):
        res = client.get("/auth/me")
        assert res.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        res = client.get("/auth/me", headers={"Authorization": "Bearer fake.token.here"})
        assert res.status_code == 401

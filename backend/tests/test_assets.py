"""
Unit tests for the assets API.
S3 calls are mocked with unittest.mock so no real AWS credentials are needed.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.security.auth import verify_token


def _register_and_login(client, username, email, password):
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


class TestUploadEndpoint:

    def test_upload_requires_auth(self, client):
        res = client.post("/assets/upload", files={
            "file": ("test.txt", b"hello", "text/plain")
        })
        assert res.status_code == 401

    def test_upload_valid_file(self, client):
        token = _register_and_login(client, "uploader1", "up1@example.com", "UpPass123")

        with patch("app.api.assets.upload_to_s3", return_value="mocked-key-123.txt"):
            res = client.post(
                "/assets/upload",
                files={"file": ("hello.txt", b"hello world", "text/plain")},
                headers={"Authorization": f"Bearer {token}"}
            )

        assert res.status_code == 200
        body = res.json()
        assert body["asset_name"] == "hello.txt"
        assert "asset_id" in body
        assert "sha256" in body

    def test_upload_unsupported_file_type(self, client):
        token = _register_and_login(client, "uploader2", "up2@example.com", "UpPass456")

        res = client.post(
            "/assets/upload",
            files={"file": ("malware.exe", b"bad content", "application/octet-stream")},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 400
        assert "Unsupported file type" in res.json()["detail"]

    def test_upload_file_too_large(self, client):
        token = _register_and_login(client, "uploader3", "up3@example.com", "UpPass789")

        big_content = b"x" * (11 * 1024 * 1024)  # 11 MB
        res = client.post(
            "/assets/upload",
            files={"file": ("big.txt", big_content, "text/plain")},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 400
        assert "10 MB" in res.json()["detail"]

    def test_upload_s3_failure_returns_502(self, client):
        token = _register_and_login(client, "uploader4", "up4@example.com", "UpPass000")

        with patch("app.api.assets.upload_to_s3", side_effect=Exception("S3 unavailable")):
            res = client.post(
                "/assets/upload",
                files={"file": ("fail.txt", b"data", "text/plain")},
                headers={"Authorization": f"Bearer {token}"}
            )
        assert res.status_code == 502
        assert "Failed to upload" in res.json()["detail"]


class TestGetAssets:

    def test_get_assets_requires_auth(self, client):
        res = client.get("/assets/")
        assert res.status_code == 401

    def test_get_assets_empty_for_new_user(self, client):
        token = _register_and_login(client, "lister1", "lst1@example.com", "LstPass123")
        res = client.get("/assets/", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json() == []

    def test_get_assets_returns_uploaded_asset(self, client):
        token = _register_and_login(client, "lister2", "lst2@example.com", "LstPass456")

        with patch("app.api.assets.upload_to_s3", return_value="key-list-test.txt"):
            client.post(
                "/assets/upload",
                files={"file": ("listed.txt", b"content", "text/plain")},
                headers={"Authorization": f"Bearer {token}"}
            )

        res = client.get("/assets/", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assets = res.json()
        assert len(assets) == 1
        assert assets[0]["asset_name"] == "listed.txt"

    def test_users_cannot_see_each_others_assets(self, client):
        token_a = _register_and_login(client, "user_a", "usera@example.com", "PassA111")
        token_b = _register_and_login(client, "user_b", "userb@example.com", "PassB222")

        with patch("app.api.assets.upload_to_s3", return_value="key-user-a.txt"):
            client.post(
                "/assets/upload",
                files={"file": ("secret.txt", b"user a secret", "text/plain")},
                headers={"Authorization": f"Bearer {token_a}"}
            )

        res = client.get("/assets/", headers={"Authorization": f"Bearer {token_b}"})
        assert res.status_code == 200
        assert res.json() == []


class TestDeleteAsset:

    def test_delete_own_asset(self, client):
        token = _register_and_login(client, "deleter1", "del1@example.com", "DelPass123")

        with patch("app.api.assets.upload_to_s3", return_value="key-to-delete.txt"):
            upload_res = client.post(
                "/assets/upload",
                files={"file": ("todelete.txt", b"bye", "text/plain")},
                headers={"Authorization": f"Bearer {token}"}
            )
        asset_id = upload_res.json()["asset_id"]

        with patch("app.api.assets.delete_file"):
            res = client.delete(
                f"/assets/{asset_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
        assert res.status_code == 200
        assert res.json()["message"] == "Asset deleted successfully"

    def test_cannot_delete_other_users_asset(self, client):
        token_owner = _register_and_login(client, "owner1", "own1@example.com", "OwnPass123")
        token_other = _register_and_login(client, "other1", "oth1@example.com", "OthPass456")

        with patch("app.api.assets.upload_to_s3", return_value="key-owner.txt"):
            upload_res = client.post(
                "/assets/upload",
                files={"file": ("owned.txt", b"mine", "text/plain")},
                headers={"Authorization": f"Bearer {token_owner}"}
            )
        asset_id = upload_res.json()["asset_id"]

        res = client.delete(
            f"/assets/{asset_id}",
            headers={"Authorization": f"Bearer {token_other}"}
        )
        assert res.status_code == 404

    def test_delete_nonexistent_asset(self, client):
        token = _register_and_login(client, "deleter2", "del2@example.com", "DelPass999")
        res = client.delete("/assets/99999", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 404

"""
Test configuration.

Strategy:
  - Patch app.database.engine with an in-memory SQLite engine BEFORE
    any other app module is imported. This prevents database.py from
    ever attempting a MySQL connection during tests.
  - Override the get_db dependency so every request uses the same
    SQLite session.
"""

import os
import sys

# ── 1. Env vars must be set before pydantic-settings reads them ───────────────
os.environ.update({
    "DB_HOST":        "localhost",
    "DB_PORT":        "3306",
    "DB_USER":        "root",
    "DB_PASSWORD":    "root",
    "DB_NAME":        "test_db",
    "SECRET_KEY":     "test-secret-key-for-ci",
    "AWS_ACCESS_KEY": "testing",
    "AWS_SECRET_KEY": "testing",
    "AWS_REGION":     "us-east-1",
    "S3_BUCKET":      "test-bucket",
    "SMTP_HOST":      "smtp.gmail.com",
    "SMTP_PORT":      "587",
    "SMTP_USER":      "test@example.com",
    "SMTP_PASSWORD":  "test",
    "SMTP_FROM":      "test@example.com",
})

# ── 2. Build the SQLite engine BEFORE importing any app module ────────────────
from sqlalchemy import create_engine               # noqa: E402
from sqlalchemy.orm import sessionmaker            # noqa: E402
from sqlalchemy.pool import StaticPool             # noqa: E402

_sqlite_engine = create_engine(
    "sqlite://",                          # pure in-memory, no file
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

_TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=_sqlite_engine,
)

# ── 3. Monkey-patch app.database BEFORE the app is imported ──────────────────
import importlib                                   # noqa: E402
import app.database as _db_module                 # noqa: E402  (triggers settings read, but NOT a connect)

_db_module.engine       = _sqlite_engine
_db_module.SessionLocal = _TestingSessionLocal

# Rebind the engine on Base.metadata so create_all uses SQLite
from sqlalchemy.orm import declarative_base        # noqa: E402
# Re-use the same Base that models already imported
_db_module.Base.metadata.bind = _sqlite_engine

# ── 4. NOW it's safe to import the FastAPI app ────────────────────────────────
import pytest                                      # noqa: E402
from fastapi.testclient import TestClient          # noqa: E402
from app.main import app                           # noqa: E402
from app.database import Base, get_db              # noqa: E402


# ── 5. Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the whole test session on SQLite."""
    Base.metadata.create_all(bind=_sqlite_engine)
    yield
    Base.metadata.drop_all(bind=_sqlite_engine)


def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    """TestClient with DB wired to in-memory SQLite."""
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()

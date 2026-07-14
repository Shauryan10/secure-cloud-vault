"""
Test configuration — spins up an in-memory SQLite database so tests
never touch MySQL, S3, or any real infrastructure.
"""

import os
import pytest

# ── Set env vars BEFORE any app module is imported ──────────────────────────
os.environ.setdefault("DB_HOST",     "localhost")
os.environ.setdefault("DB_PORT",     "3306")
os.environ.setdefault("DB_USER",     "root")
os.environ.setdefault("DB_PASSWORD", "root")
os.environ.setdefault("DB_NAME",     "test_db")
os.environ.setdefault("SECRET_KEY",  "test-secret-key-for-ci")
os.environ.setdefault("AWS_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECRET_KEY", "testing")
os.environ.setdefault("AWS_REGION",     "us-east-1")
os.environ.setdefault("S3_BUCKET",      "test-bucket")
os.environ.setdefault("SMTP_HOST",      "smtp.gmail.com")
os.environ.setdefault("SMTP_PORT",      "587")
os.environ.setdefault("SMTP_USER",      "test@example.com")
os.environ.setdefault("SMTP_PASSWORD",  "test")
os.environ.setdefault("SMTP_FROM",      "test@example.com")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app

# ── In-memory SQLite engine ──────────────────────────────────────────────────
SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the whole test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """
    Returns a TestClient with the DB dependency overridden to use
    in-memory SQLite. Each test function gets a fresh override.
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

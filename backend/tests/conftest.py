"""Shared test fixtures for backend tests."""
import uuid
import time
import sqlite3
import pytest
from fastapi.testclient import TestClient
from database import DB_PATH, SCHEMA_SQL
from main import app
from security import hash_password


@pytest.fixture(scope="function")
def client():
    """Sync test client with real DB init using sync sqlite3."""
    conn = sqlite3.connect(str(DB_PATH))
    # Create schema first (idempotent), then clear data
    conn.executescript(SCHEMA_SQL)
    conn.executescript("""
        DELETE FROM chapter_notes;
        DELETE FROM glossary;
        DELETE FROM chapters;
        DELETE FROM projects;
        DELETE FROM users;
    """)
    conn.commit()
    conn.close()
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def auth_client(client):
    """Client with a pre-registered user and auth header set."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "username": "testuser",
        "password": "password123",
    })
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
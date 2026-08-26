import pytest
import sqlite3
from fastapi.testclient import TestClient
from database import DB_PATH, SCHEMA_SQL
from main import app


@pytest.fixture(scope="function")
def client():
    """Sync test client with real DB init using sync sqlite3."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript("DELETE FROM chapter_notes; DELETE FROM glossary; DELETE FROM chapters; DELETE FROM projects;")
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
    with TestClient(app) as c:
        yield c
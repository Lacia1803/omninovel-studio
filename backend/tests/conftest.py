import pytest
import pytest_asyncio
import aiosqlite
from httpx import AsyncClient, ASGITransport

import database
from routers import projects as proj_router
from routers import chapters as chap_router
from routers import glossary as gloss_router
from routers import translate as trans_router


@pytest_asyncio.fixture
async def db():
    """In-memory test database."""
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    await conn.executescript(database.SCHEMA_SQL)
    await conn.commit()
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def client(db):
    """HTTP test client with test DB override."""
    async def override_get_db():
        return db

    from main import app
    app.dependency_overrides[proj_router.get_db] = override_get_db
    app.dependency_overrides[chap_router.get_db] = override_get_db
    app.dependency_overrides[gloss_router.get_db] = override_get_db
    app.dependency_overrides[trans_router.get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
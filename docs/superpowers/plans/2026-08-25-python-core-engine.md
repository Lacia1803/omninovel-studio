# Python Core Engine — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python FastAPI backend that replaces client-side logic as the core processing engine for OmniNovel Studio.

**Architecture:** Backend-first. FastAPI REST server with aiosqlite for persistence. Provider pattern for translators, library-based parsers for file formats. Frontend calls API instead of doing work client-side.

**Tech Stack:** Python 3.11+, FastAPI, aiosqlite, httpx, PyMuPDF, ebooklib, python-docx, chardet, pytest

**Spec:** `docs/superpowers/specs/2026-08-25-python-core-engine-design.md`

## Global Constraints

- Python >= 3.11 (user has 3.11.9)
- All async endpoints (FastAPI native async)
- SQLite DB stored at `backend/omninovel.db`
- No ORM — raw SQL with aiosqlite
- API base path: `/api`
- Frontend dev server proxies `/api` → `localhost:8000`
- All error responses: `{"detail": "message"}` (FastAPI default)
- Chapter status enum: `raw | converting | converted | translating | translated | error`
- Glossary category enum: `name | location | technique | item | general`
- Translation provider enum: `free_google | free_mymemory | gemini | openai | deepseek | claude | ollama | vietphrase_only`

---

## File Structure

### New Files (Backend)

| File | Responsibility |
|------|---------------|
| `backend/requirements.txt` | Python dependencies |
| `backend/main.py` | FastAPI app, CORS, lifespan (DB init/close), router includes |
| `backend/database.py` | aiosqlite connection, schema creation, helper query functions |
| `backend/models.py` | All Pydantic request/response models |
| `backend/routers/__init__.py` | Empty |
| `backend/routers/projects.py` | `/api/projects` CRUD |
| `backend/routers/chapters.py` | `/api/projects/{id}/chapters` CRUD |
| `backend/routers/glossary.py` | `/api/projects/{id}/glossary` CRUD |
| `backend/routers/translate.py` | `/api/translate`, `/api/projects/{id}/translate-batch` |
| `backend/routers/parse.py` | `/api/parse` file upload |
| `backend/services/__init__.py` | Empty |
| `backend/services/translator.py` | Provider ABC + all translator implementations |
| `backend/services/parser.py` | All file format parsers |
| `backend/services/glossary.py` | Pre-glossary matching logic |
| `backend/services/chapter_splitter.py` | Regex-based chapter detection |
| `backend/tests/__init__.py` | Empty |
| `backend/tests/conftest.py` | Shared fixtures |
| `backend/tests/test_database.py` | DB operations tests |
| `backend/tests/test_parser.py` | Parser tests |
| `backend/tests/test_translator.py` | Translator tests |
| `backend/tests/test_api.py` | API endpoint tests |

### Modified Files (Frontend)

| File | Change |
|------|--------|
| `vite.config.ts` | Add proxy `/api` → `localhost:8000` |
| `src/services/api.ts` | NEW — API client layer |
| `src/App.tsx` | Switch from localStorage to API calls |

---

### Task 1: Backend Scaffold + Database

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/database.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/services/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

**Interfaces:**
- Produces: `database.get_db()` → async connection, `database.init_db()` → creates tables

- [ ] **Step 1: Create directory structure**

```bash
cd "H:/New folder (2)"
mkdir -p backend/routers backend/services backend/tests
touch backend/__init__.py 2>/dev/null || true
touch backend/routers/__init__.py
touch backend/services/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

```txt
# backend/requirements.txt
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
aiosqlite>=0.20.0
httpx>=0.28.0
ebooklib>=0.18.0
PyMuPDF>=1.25.0
python-docx>=1.1.0
chardet>=5.2.0
beautifulsoup4>=4.12.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
```

- [ ] **Step 3: Install dependencies**

```bash
cd "H:/New folder (2)/backend"
python -m venv venv
source venv/Scripts/activate  # Git Bash on Windows
pip install -r requirements.txt
```

- [ ] **Step 4: Write database.py**

```python
# backend/database.py
import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent / "omninovel.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'Khuyết danh',
    source_language TEXT DEFAULT 'zh-CN',
    target_language TEXT DEFAULT 'vi',
    settings_json TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    original_content TEXT NOT NULL,
    converted_content TEXT,
    translated_content TEXT,
    status TEXT DEFAULT 'raw',
    word_count INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS glossary (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    source_term TEXT NOT NULL,
    target_term TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_glossary_project ON glossary(project_id);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
    finally:
        await db.close()
```

- [ ] **Step 5: Write main.py**

```python
# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import projects, chapters, glossary, translate, parse


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="OmniNovel Studio API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(chapters.router, prefix="/api")
app.include_router(glossary.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.include_router(parse.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Write conftest.py**

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
import aiosqlite
from httpx import AsyncClient, ASGITransport

# Import so DB path is available for override
import database


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
    # Override get_db to return our test DB
    async def override_get_db():
        return db

    from main import app
    from routers import projects as proj_router
    from routers import chapters as chap_router
    from routers import glossary as gloss_router
    app.dependency_overrides[proj_router.get_db] = override_get_db
    app.dependency_overrides[chap_router.get_db] = override_get_db
    app.dependency_overrides[gloss_router.get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 7: Verify server starts**

```bash
cd "H:/New folder (2)/backend"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Expected: Server starts, `http://localhost:8000/api/health` returns `{"status": "ok"}`

- [ ] **Step 8: Commit**

```bash
cd "H:/New folder (2)"
git add backend/
git commit -m "feat: backend scaffold - FastAPI app, aiosqlite database, health endpoint"
```

---

### Task 2: Pydantic Models

**Files:**
- Create: `backend/models.py`

**Interfaces:**
- Consumes: Schema definitions from spec
- Produces: All request/response models used by routers and services

- [ ] **Step 1: Write models.py**

```python
# backend/models.py
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


# ── Project ──────────────────────────────────────────

class CreateProject(BaseModel):
    title: str = "Dự án mới"
    author: str = "Khuyết danh"
    source_language: str = "zh-CN"
    target_language: str = "vi"

class UpdateProject(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    settings_json: Optional[str] = None

class ProjectSummary(BaseModel):
    id: str
    title: str
    author: str
    updated_at: int

class ProjectResponse(BaseModel):
    id: str
    title: str
    author: str
    source_language: str
    target_language: str
    settings_json: str
    created_at: int
    updated_at: int


# ── Chapter ──────────────────────────────────────────

class CreateChapter(BaseModel):
    number: int
    title: str
    original_content: str
    word_count: Optional[int] = None

class UpdateChapter(BaseModel):
    number: Optional[int] = None
    title: Optional[str] = None
    original_content: Optional[str] = None
    converted_content: Optional[str] = None
    translated_content: Optional[str] = None
    status: Optional[str] = None
    word_count: Optional[int] = None

class ChapterResponse(BaseModel):
    id: str
    project_id: str
    number: int
    title: str
    original_content: str
    converted_content: Optional[str] = None
    translated_content: Optional[str] = None
    status: str
    word_count: Optional[int] = None


# ── Glossary ─────────────────────────────────────────

class CreateGlossaryItem(BaseModel):
    source_term: str
    target_term: str
    category: str = "general"
    enabled: bool = True

class UpdateGlossaryItem(BaseModel):
    source_term: Optional[str] = None
    target_term: Optional[str] = None
    category: Optional[str] = None
    enabled: Optional[bool] = None

class GlossaryItemResponse(BaseModel):
    id: str
    project_id: str
    source_term: str
    target_term: str
    category: str
    enabled: bool


# ── Translation ──────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "zh-CN"
    target_lang: str = "vi"
    provider: str = "free_google"
    api_key: str = ""
    custom_endpoint: Optional[str] = None
    model: str = "gemini-2.0-flash"
    style_prompt: str = "literary"
    custom_prompt: Optional[str] = None
    temperature: float = 0.3
    apply_glossary: bool = True
    glossary: list[dict] = []

class TranslateResponse(BaseModel):
    translated_text: str
    provider_used: str
    token_count: Optional[int] = None

class BatchTranslateRequest(BaseModel):
    chapter_ids: list[str]
    mode: str = "ai"  # "ai" | "vietphrase"


# ── Parse ────────────────────────────────────────────

class ParsedNovelData(BaseModel):
    title: str
    author: str
    detected_language: str
    chapters: list[dict]


# ── Full Project (with nested data) ──────────────────

class FullProject(BaseModel):
    id: str
    title: str
    author: str
    source_language: str
    target_language: str
    settings_json: str
    created_at: int
    updated_at: int
    chapters: list[ChapterResponse]
    glossary: list[GlossaryItemResponse]
```

- [ ] **Step 2: Verify import works**

```bash
cd "H:/New folder (2)/backend"
python -c "from models import *; print('Models OK')"
```

Expected: `Models OK`

- [ ] **Step 3: Commit**

```bash
cd "H:/New folder (2)"
git add backend/models.py
git commit -m "feat: Pydantic models for all API request/response types"
```

---

### Task 3: Projects CRUD Router

**Files:**
- Create: `backend/routers/projects.py`
- Create: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `database.get_db()`, `models.CreateProject`, `models.UpdateProject`
- Produces: `GET /api/projects`, `GET /api/projects/{id}`, `POST /api/projects`, `PUT /api/projects/{id}`, `DELETE /api/projects/{id}`

- [ ] **Step 1: Write failing test for create project**

```python
# backend/tests/test_api.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    response = await client.post("/api/projects", json={
        "title": "Test Novel",
        "author": "Author Name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Novel"
    assert data["author"] == "Author Name"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient):
    response = await client.get("/api/projects")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient):
    response = await client.get("/api/projects/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    create = await client.post("/api/projects", json={"title": "To Delete"})
    pid = create.json()["id"]
    response = await client.delete(f"/api/projects/{pid}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    # Verify gone
    response = await client.get(f"/api/projects/{pid}")
    assert response.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_api.py -v
```

Expected: FAIL (routers not wired, endpoints don't exist yet)

- [ ] **Step 3: Write projects router**

```python
# backend/routers/projects.py
import uuid
import time
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateProject, UpdateProject, ProjectSummary, ProjectResponse, FullProject
from routers import chapters as chap_router, glossary as gloss_router

router = APIRouter(tags=["projects"])

# Re-export get_db for dependency override in tests
get_db_dep = get_db


@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, title, author, updated_at FROM projects ORDER BY updated_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    body: CreateProject,
    db: aiosqlite.Connection = Depends(get_db),
):
    now = int(time.time() * 1000)
    project_id = f"project_{uuid.uuid4().hex[:12]}"
    await db.execute(
        "INSERT INTO projects (id, title, author, source_language, target_language, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)",
        (project_id, body.title, body.author, body.source_language, body.target_language, now, now),
    )
    await db.commit()
    return {
        "id": project_id,
        "title": body.title,
        "author": body.author,
        "source_language": body.source_language,
        "target_language": body.target_language,
        "settings_json": "{}",
        "created_at": now,
        "updated_at": now,
    }


@router.get("/projects/{project_id}", response_model=FullProject)
async def get_project(
    project_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project = dict(row)

    # Fetch chapters
    cursor = await db.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY number",
        (project_id,),
    )
    chapters = [dict(r) for r in await cursor.fetchall()]

    # Fetch glossary
    cursor = await db.execute(
        "SELECT * FROM glossary WHERE project_id = ?",
        (project_id,),
    )
    glossary_items = [dict(r) for r in await cursor.fetchall()]

    return {**project, "chapters": chapters, "glossary": glossary_items}


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: UpdateProject,
    db: aiosqlite.Connection = Depends(get_db),
):
    # Check exists
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = int(time.time() * 1000)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [project_id]

    await db.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    return dict(await cursor.fetchone())


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    await db.execute("DELETE FROM glossary WHERE project_id = ?", (project_id,))
    await db.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
    await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    await db.commit()
    return {"ok": True}
```

- [ ] **Step 4: Fix test conftest for proper dependency override**

Replace `backend/tests/conftest.py`:

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
import aiosqlite
from httpx import AsyncClient, ASGITransport

import database
from routers import projects as proj_router
from routers import chapters as chap_router
from routers import glossary as gloss_router


@pytest_asyncio.fixture
async def db():
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    await conn.executescript(database.SCHEMA_SQL)
    await conn.commit()
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def client(db):
    async def override_get_db():
        return db

    from main import app
    app.dependency_overrides[proj_router.get_db] = override_get_db
    app.dependency_overrides[chap_router.get_db] = override_get_db
    app.dependency_overrides[gloss_router.get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_api.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
cd "H:/New folder (2)"
git add backend/routers/projects.py backend/tests/test_api.py backend/tests/conftest.py
git commit -m "feat: projects CRUD router with list, create, get, update, delete"
```

---

### Task 4: Chapters CRUD Router

**Files:**
- Create: `backend/routers/chapters.py`

**Interfaces:**
- Consumes: `database.get_db()`, `models.CreateChapter`, `models.UpdateChapter`
- Produces: `POST /api/projects/{id}/chapters`, `PUT /api/projects/{id}/chapters/{chap_id}`, `DELETE /api/projects/{id}/chapters/{chap_id}`

- [ ] **Step 1: Add chapter tests to test_api.py**

Append to `backend/tests/test_api.py`:

```python
@pytest.mark.asyncio
async def test_add_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    response = await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1,
        "title": "Chương 1",
        "original_content": "Nội dung chương 1",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Chương 1"
    assert data["project_id"] == pid


@pytest.mark.asyncio
async def test_update_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    chap = (await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "Old", "original_content": "text",
    })).json()
    response = await client.put(f"/api/projects/{pid}/chapters/{chap['id']}", json={
        "title": "New",
        "translated_content": "translated text",
        "status": "translated",
    })
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert response.json()["status"] == "translated"


@pytest.mark.asyncio
async def test_delete_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    chap = (await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "To Delete", "original_content": "text",
    })).json()
    response = await client.delete(f"/api/projects/{pid}/chapters/{chap['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_api.py::test_add_chapter -v
```

Expected: FAIL (endpoint not found)

- [ ] **Step 3: Write chapters router**

```python
# backend/routers/chapters.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateChapter, UpdateChapter, ChapterResponse

router = APIRouter(tags=["chapters"])


@router.post("/projects/{project_id}/chapters", response_model=ChapterResponse)
async def add_chapter(
    project_id: str,
    body: CreateChapter,
    db: aiosqlite.Connection = Depends(get_db),
):
    # Verify project exists
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    chap_id = f"chap_{uuid.uuid4().hex[:12]}"
    word_count = body.word_count or len(body.original_content)

    await db.execute(
        "INSERT INTO chapters (id, project_id, number, title, original_content, status, word_count) VALUES (?, ?, ?, ?, ?, 'raw', ?)",
        (chap_id, project_id, body.number, body.title, body.original_content, word_count),
    )
    await db.commit()

    return {
        "id": chap_id,
        "project_id": project_id,
        "number": body.number,
        "title": body.title,
        "original_content": body.original_content,
        "converted_content": None,
        "translated_content": None,
        "status": "raw",
        "word_count": word_count,
    }


@router.put("/projects/{project_id}/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(
    project_id: str,
    chapter_id: str,
    body: UpdateChapter,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?",
        (chapter_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Chapter not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [chapter_id]

    await db.execute(f"UPDATE chapters SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
    return dict(await cursor.fetchone())


@router.delete("/projects/{project_id}/chapters/{chapter_id}")
async def delete_chapter(
    project_id: str,
    chapter_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM chapters WHERE id = ? AND project_id = ?",
        (chapter_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Chapter not found")

    await db.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
    await db.commit()
    return {"ok": True}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_api.py -v
```

Expected: All tests PASS (now 7 tests)

- [ ] **Step 5: Commit**

```bash
cd "H:/New folder (2)"
git add backend/routers/chapters.py backend/tests/test_api.py
git commit -m "feat: chapters CRUD router with add, update, delete"
```

---

### Task 5: Glossary Router

**Files:**
- Create: `backend/routers/glossary.py`

**Interfaces:**
- Consumes: `database.get_db()`, `models.CreateGlossaryItem`, `models.UpdateGlossaryItem`
- Produces: `POST /api/projects/{id}/glossary`, `PUT .../{item_id}`, `DELETE .../{item_id}`

- [ ] **Step 1: Add glossary tests to test_api.py**

```python
@pytest.mark.asyncio
async def test_add_glossary_item(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    response = await client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "老祖",
        "target_term": "Lão Tổ",
        "category": "name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["source_term"] == "老祖"
    assert data["target_term"] == "Lão Tổ"


@pytest.mark.asyncio
async def test_delete_glossary_item(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    item = (await client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "test", "target_term": "test_vi",
    })).json()
    response = await client.delete(f"/api/projects/{pid}/glossary/{item['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
```

- [ ] **Step 2: Write glossary router**

```python
# backend/routers/glossary.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateGlossaryItem, UpdateGlossaryItem, GlossaryItemResponse

router = APIRouter(tags=["glossary"])


@router.post("/projects/{project_id}/glossary", response_model=GlossaryItemResponse)
async def add_glossary_item(
    project_id: str,
    body: CreateGlossaryItem,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    item_id = f"gl_{uuid.uuid4().hex[:12]}"
    await db.execute(
        "INSERT INTO glossary (id, project_id, source_term, target_term, category, enabled) VALUES (?, ?, ?, ?, ?, ?)",
        (item_id, project_id, body.source_term, body.target_term, body.category, int(body.enabled)),
    )
    await db.commit()

    return {
        "id": item_id,
        "project_id": project_id,
        "source_term": body.source_term,
        "target_term": body.target_term,
        "category": body.category,
        "enabled": body.enabled,
    }


@router.put("/projects/{project_id}/glossary/{item_id}", response_model=GlossaryItemResponse)
async def update_glossary_item(
    project_id: str,
    item_id: str,
    body: UpdateGlossaryItem,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM glossary WHERE id = ? AND project_id = ?",
        (item_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Glossary item not found")

    updates = {}
    for k, v in body.model_dump().items():
        if v is not None:
            updates[k] = int(v) if k == "enabled" else v
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [item_id]
    await db.execute(f"UPDATE glossary SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM glossary WHERE id = ?", (item_id,))
    row = dict(await cursor.fetchone())
    row["enabled"] = bool(row["enabled"])
    return row


@router.delete("/projects/{project_id}/glossary/{item_id}")
async def delete_glossary_item(
    project_id: str,
    item_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM glossary WHERE id = ? AND project_id = ?",
        (item_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Glossary item not found")

    await db.execute("DELETE FROM glossary WHERE id = ?", (item_id,))
    await db.commit()
    return {"ok": True}
```

- [ ] **Step 3: Run tests**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_api.py -v
```

Expected: All tests PASS (now 9 tests)

- [ ] **Step 4: Commit**

```bash
cd "H:/New folder (2)"
git add backend/routers/glossary.py backend/tests/test_api.py
git commit -m "feat: glossary router with add, update, delete"
```

---

### Task 6: Chapter Splitter Service

**Files:**
- Create: `backend/services/chapter_splitter.py`
- Create: `backend/tests/test_chapter_splitter.py`

**Interfaces:**
- Consumes: raw text string + optional custom regex
- Produces: `split_chapters(text, custom_regex) → list[dict]` where each dict has `{number, title, content}`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_chapter_splitter.py
from services.chapter_splitter import split_chapters


def test_chinese_chapter_detection():
    text = """第一章 初入江湖

少年站在山巅，望着远方的城镇。

第二章 师父教导

老者盘膝而坐，开始传授心法。"""

    chapters = split_chapters(text)
    assert len(chapters) == 2
    assert chapters[0]["title"] == "第一章 初入江湖"
    assert chapters[1]["title"] == "第二章 师父教导"
    assert "少年" in chapters[0]["content"]


def test_english_chapter_detection():
    text = """Chapter 1 - The Beginning

It was a dark and stormy night.

Chapter 2 - The Journey

They set out at dawn."""

    chapters = split_chapters(text)
    assert len(chapters) == 2
    assert "Beginning" in chapters[0]["title"]


def test_no_chapter_markers():
    text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    chapters = split_chapters(text)
    assert len(chapters) == 1
    assert "Paragraph one" in chapters[0]["content"]


def test_custom_regex():
    text = """P1: First Part
Content here.

P2: Second Part
More content."""
    chapters = split_chapters(text, custom_regex=r"^P\d+:.*$")
    assert len(chapters) == 2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_chapter_splitter.py -v
```

Expected: FAIL (module not found)

- [ ] **Step 3: Write chapter_splitter.py**

```python
# backend/services/chapter_splitter.py
import re


# Default patterns for chapter detection
CHAPTER_PATTERNS = [
    # Chinese: 第X章/回/节/卷
    r"^第[零一二三四五六七八九十百千万\d]+[章回节卷].*$",
    # English: Chapter N, CHAPTER N
    r"^Chapter\s+\d+.*$",
    r"^CHAPTER\s+\d+.*$",
    # Vietnamese: Chương N
    r"^Chương\s+\d+.*$",
    r"^CHƯƠNG\s+\d+.*$",
]


def split_chapters(text: str, custom_regex: str | None = None) -> list[dict]:
    """Split raw text into chapters using regex detection.

    Returns list of dicts: [{number, title, content}]
    """
    if not text or not text.strip():
        return [{"number": 1, "title": "Untitled", "content": text or ""}]

    patterns = [re.compile(custom_regex, re.MULTILINE)] if custom_regex else [re.compile(p, re.MULTILINE) for p in CHAPTER_PATTERNS]

    # Find all chapter marker positions
    markers: list[tuple[int, str]] = []
    for line in text.split("\n"):
        line_stripped = line.strip()
        for pattern in patterns:
            if pattern.match(line_stripped):
                markers.append((text.find(line_stripped), line_stripped))
                break

    # Deduplicate overlapping matches (different patterns matching same line)
    markers = list({m[1]: m for m in markers}.values())
    markers.sort(key=lambda m: m[0])

    if not markers:
        # No chapter markers found — return entire text as single chapter
        return [{"number": 1, "title": "Nội dung", "content": text.strip()}]

    chapters = []
    for i, (pos, title) in enumerate(markers):
        # Content starts after the title line
        line_end = text.index("\n", pos) + 1 if "\n" in text[pos:] else len(text)
        content_start = line_end

        # Content ends at next marker or end of text
        if i + 1 < len(markers):
            next_pos = markers[i + 1][0]
            content_end = next_pos
        else:
            content_end = len(text)

        content = text[content_start:content_end].strip()
        chapters.append({
            "number": i + 1,
            "title": title,
            "content": content,
        })

    return chapters
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_chapter_splitter.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd "H:/New folder (2)"
git add backend/services/chapter_splitter.py backend/tests/test_chapter_splitter.py
git commit -m "feat: chapter splitter service with Chinese/English/Vietnamese detection"
```

---

### Task 7: Glossary Service

**Files:**
- Create: `backend/services/glossary.py`

**Interfaces:**
- Consumes: text string, list of glossary dicts `[{source_term, target_term, enabled}]`
- Produces: `apply_pre_glossary(text, glossary) → str`

- [ ] **Step 1: Write glossary.py**

```python
# backend/services/glossary.py


def apply_pre_glossary(text: str, glossary: list[dict] | None = None) -> str:
    """Replace source terms with target terms before sending to AI.

    Glossary items are sorted by length (longest first) to prevent
    partial matches from overriding full matches.
    """
    if not text or not glossary:
        return text

    active = [g for g in glossary if g.get("enabled", True) and g.get("source_term") and g.get("target_term")]
    if not active:
        return text

    # Sort by source term length descending (longest match first)
    active.sort(key=lambda g: len(g["source_term"]), reverse=True)

    result = text
    for item in active:
        result = result.replace(item["source_term"], item["target_term"])

    return result
```

- [ ] **Step 2: Verify import**

```bash
cd "H:/New folder (2)/backend"
python -c "from services.glossary import apply_pre_glossary; print(apply_pre_glossary('老祖说', [{'source_term': '老祖', 'target_term': 'Lão Tổ', 'enabled': True}]))"
```

Expected: `Lão Tổ说`

- [ ] **Step 3: Commit**

```bash
cd "H:/New folder (2)"
git add backend/services/glossary.py
git commit -m "feat: glossary pre-processing service"
```

---

### Task 8: Translator Service

**Files:**
- Create: `backend/services/translator.py`
- Create: `backend/tests/test_translator.py`

**Interfaces:**
- Consumes: text, source_lang, target_lang, provider settings, glossary
- Produces: `TranslateResult(translated_text, provider_used, token_count)`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_translator.py
import pytest
from unittest.mock import AsyncMock, patch
from services.translator import translate_text


@pytest.mark.asyncio
async def test_glossary_apply_before_translate():
    glossary = [
        {"source_term": "老祖", "target_term": "Lão Tổ", "enabled": True},
    ]
    with patch("services.translator.translate_free_google", new_callable=AsyncMock) as mock:
        mock.return_value = type("R", (), {"translated_text": "mock", "provider_used": "mock", "token_count": None})()
        result = await translate_text("老祖说话", "zh-CN", "vi", {"provider": "free_google"}, glossary)
        # Google translator should receive text with glossary applied
        call_args = mock.call_args
        assert "Lão Tổ" in call_args[0][0]


@pytest.mark.asyncio
async def test_empty_text_returns_empty():
    result = await translate_text("", "zh-CN", "vi", {"provider": "free_google"})
    assert result["translated_text"] == ""
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_translator.py -v
```

Expected: FAIL

- [ ] **Step 3: Write translator.py**

```python
# backend/services/translator.py
import re
import httpx
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict

from services.glossary import apply_pre_glossary


@dataclass
class TranslateResult:
    translated_text: str
    provider_used: str
    token_count: int | None = None

    def to_dict(self):
        return asdict(self)


# ── System Prompt Builder ────────────────────────────

STYLE_PROMPTS = {
    "literary": "Dịch mượt mà, văn phong tiểu thuyết Tiếng Việt bay bổng, tự nhiên, thoát nghĩa nhưng giữ nguyên nội dung gốc.",
    "wuxia": "Dịch theo phong cách Tiên hiệp/Kiếm hiệp/Ngôn tình cổ đại. Sử dụng từ Hán Việt sang trọng, chuẩn xưng hô (huynh, đệ, tỷ, muội, sư tôn, lão tổ...).",
    "literal": "Dịch sát nghĩa từng câu, giữ nguyên cấu trúc câu để đối chiếu học thuật.",
}


def build_novel_system_prompt(settings: dict, glossary: list[dict] | None = None) -> str:
    style_key = settings.get("style_prompt", "literary")
    if style_key == "custom":
        style_instruction = settings.get("custom_prompt", "Dịch sang Tiếng Việt mượt mà, chuẩn văn phong truyện chữ.")
    else:
        style_instruction = STYLE_PROMPTS.get(style_key, STYLE_PROMPTS["literary"])

    glossary_instruction = ""
    if settings.get("apply_glossary") and glossary:
        active = [g for g in glossary if g.get("enabled", True)]
        if active:
            lines = [f'- "{g["source_term"]}" -> "{g["target_term"]}"' for g in active]
            glossary_instruction = f"\nBẮT BUỘC tuân thủ bảng thuật ngữ/tên nhân vật sau:\n" + "\n".join(lines) + "\n"

    return f"""Bạn là một dịch giả tiểu thuyết chuyên nghiệp. Nhiệm vụ của bạn là dịch đoạn văn bản truyện sau đây sang Tiếng Việt.
- Yêu cầu phong cách: {style_instruction}
- Giữ nguyên định dạng các đoạn văn, xuống dòng, dấu câu.
- Không tự ý thêm bớt các tình tiết hoặc lời bình luận cá nhân.
{glossary_instruction}
Chỉ trả về duy nhất nội dung văn bản đã dịch."""


# ── Chunking ─────────────────────────────────────────

def split_text_into_chunks(text: str, max_length: int) -> list[str]:
    if len(text) <= max_length:
        return [text]
    paragraphs = text.split("\n")
    chunks, current = [], ""
    for p in paragraphs:
        if len(current) + len(p) + 1 > max_length:
            if current:
                chunks.append(current)
            current = p
        else:
            current = f"{current}\n{p}" if current else p
    if current:
        chunks.append(current)
    return chunks


# ── Provider ABC ─────────────────────────────────────

class TranslatorProvider(ABC):
    @abstractmethod
    async def translate(self, text: str, source_lang: str, target_lang: str,
                        settings: dict, glossary: list[dict]) -> TranslateResult: ...


# ── Google Free ──────────────────────────────────────

class GoogleFreeTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        chunks = split_text_into_chunks(text, 1800)
        results = []
        async with httpx.AsyncClient(timeout=30) as client:
            for chunk in chunks:
                sl = source_lang if source_lang != "auto" else "auto"
                url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={target_lang}&dt=t&q={chunk}"
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                translated = ""
                if data and data[0]:
                    for item in data[0]:
                        if item and item[0]:
                            translated += item[0]
                results.append(translated or chunk)
        return TranslateResult(
            translated_text="\n".join(results),
            provider_used="Google Translate (Free)",
        )


# ── MyMemory Free ────────────────────────────────────

class MyMemoryTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        chunks = split_text_into_chunks(text, 500)
        results = []
        src = "zh" if source_lang == "auto" else source_lang
        async with httpx.AsyncClient(timeout=30) as client:
            for chunk in chunks:
                url = f"https://api.mymemory.translated.net/get?q={chunk}&langpair={src}|{target_lang}"
                resp = await client.get(url)
                data = resp.json()
                results.append(data.get("responseData", {}).get("translatedText", chunk))
        return TranslateResult(
            translated_text="\n".join(results),
            provider_used="MyMemory (Free)",
        )


# ── OpenAI-compatible (Gemini, OpenAI, DeepSeek, custom) ──

class OpenAICompatibleTranslator(TranslatorProvider):
    def __init__(self, default_endpoint: str, default_model: str, provider_name: str):
        self.default_endpoint = default_endpoint
        self.default_model = default_model
        self.provider_name = provider_name

    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError(f"API Key required for {self.provider_name}")

        endpoint = settings.get("custom_endpoint") or self.default_endpoint
        model = settings.get("model") or self.default_model
        system_prompt = build_novel_system_prompt(settings, glossary)

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text},
                    ],
                    "temperature": settings.get("temperature", 0.3),
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["choices"][0]["message"]["content"].strip()
            tokens = data.get("usage", {}).get("total_tokens")
            return TranslateResult(
                translated_text=translated,
                provider_used=f"{self.provider_name} ({model})",
                token_count=tokens,
            )


# ── Gemini (different API shape) ─────────────────────

class GeminiTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError("API Key required for Gemini")
        model = settings.get("model") or "gemini-2.0-flash"
        system_prompt = build_novel_system_prompt(settings, glossary)
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                json={
                    "contents": [{"role": "user", "parts": [{"text": system_prompt + "\n\nVăn bản cần dịch:\n" + text}]}],
                    "generationConfig": {"temperature": settings.get("temperature", 0.3)},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            tokens = data.get("usageMetadata", {}).get("totalTokenCount")
            return TranslateResult(translated_text=translated, provider_used=f"Gemini ({model})", token_count=tokens)


# ── Ollama ───────────────────────────────────────────

class OllamaTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        endpoint = settings.get("custom_endpoint") or "http://localhost:11434/api/generate"
        model = settings.get("model") or "qwen2.5"
        system_prompt = build_novel_system_prompt(settings, glossary)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                endpoint,
                json={"model": model, "system": system_prompt, "prompt": text, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
            return TranslateResult(
                translated_text=data.get("response", text).strip(),
                provider_used=f"Ollama ({model})",
            )


# ── Provider Registry ────────────────────────────────

PROVIDERS: dict[str, TranslatorProvider] = {
    "free_google": GoogleFreeTranslator(),
    "free_mymemory": MyMemoryTranslator(),
    "gemini": GeminiTranslator(),
    "openai": OpenAICompatibleTranslator(
        default_endpoint="https://api.openai.com/v1/chat/completions",
        default_model="gpt-4o-mini",
        provider_name="OpenAI",
    ),
    "deepseek": OpenAICompatibleTranslator(
        default_endpoint="https://api.deepseek.com/chat/completions",
        default_model="deepseek-chat",
        provider_name="DeepSeek",
    ),
    "ollama": OllamaTranslator(),
}


# ── Main translate function ──────────────────────────

async def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    settings: dict,
    glossary: list[dict] | None = None,
) -> dict:
    if not text or not text.strip():
        return TranslateResult(translated_text="", provider_used=settings.get("provider", "unknown")).to_dict()

    provider_name = settings.get("provider", "free_google")

    # Apply glossary if enabled
    processed = text
    if settings.get("apply_glossary") and glossary:
        processed = apply_pre_glossary(text, glossary)

    provider = PROVIDERS.get(provider_name)
    if not provider:
        provider = PROVIDERS["free_google"]
        provider_name = "free_google"

    try:
        result = await provider.translate(processed, source_lang, target_lang, settings, glossary or [])
        return result.to_dict()
    except Exception:
        if provider_name != "free_google":
            fallback = PROVIDERS["free_google"]
            result = await fallback.translate(processed, source_lang, target_lang, settings, glossary or [])
            return result.to_dict()
        raise
```

- [ ] **Step 4: Run tests**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_translator.py -v
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd "H:/New folder (2)"
git add backend/services/translator.py backend/tests/test_translator.py
git commit -m "feat: translator service with 6 providers, glossary, fallback chain"
```

---

### Task 9: Parser Service

**Files:**
- Create: `backend/services/parser.py`
- Create: `backend/tests/test_parser.py`

**Interfaces:**
- Consumes: file path/bytes, optional custom chapter regex
- Produces: `parse_file(file_path, custom_regex) → dict` with `{title, author, detected_language, chapters}`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_parser.py
import tempfile
import os
from services.parser import parse_txt_file, detect_language


def test_parse_utf8_txt():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("Chapter 1: Start\nHello world.\n\nChapter 2: End\nGoodbye world.")
        path = f.name
    try:
        result = parse_txt_file(path)
        assert result["title"] == os.path.basename(path).replace(".txt", "")
        assert len(result["chapters"]) == 2
        assert result["detected_language"] == "en"
    finally:
        os.unlink(path)


def test_detect_chinese():
    assert detect_language("这是一个中文句子，包含很多汉字。") == "zh-CN"


def test_detect_japanese():
    assert detect_language("これは日本語のテストです。これは日本語の文章です。") == "ja"


def test_detect_english():
    assert detect_language("This is an English text for testing.") == "en"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/test_parser.py -v
```

Expected: FAIL

- [ ] **Step 3: Write parser.py**

```python
# backend/services/parser.py
import os
import re
from pathlib import Path

import chardet

from services.chapter_splitter import split_chapters


def detect_language(text: str) -> str:
    if not text:
        return "zh-CN"
    if re.search(r"[\u3040-\u30ff]", text) and len(re.findall(r"[\u3040-\u30ff]", text)) > 5:
        return "ja"
    if re.search(r"[\uac00-\ud7af]", text) and len(re.findall(r"[\uac00-\ud7af]", text)) > 5:
        return "ko"
    if re.search(r"[\u4e00-\u9fa5]", text) and len(re.findall(r"[\u4e00-\u9fa5]", text)) > len(text) * 0.1:
        return "zh-CN"
    return "en"


def parse_txt_file(file_path: str, custom_regex: str | None = None) -> dict:
    raw = Path(file_path).read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8")
    try:
        text = raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        text = raw.decode("utf-8", errors="replace")

    title = Path(file_path).stem
    chapters = split_chapters(text, custom_regex)

    return {
        "title": title,
        "author": "Khuyết danh",
        "detected_language": detect_language(text[:1000]),
        "chapters": [
            {
                "number": c["number"],
                "title": c["title"],
                "original_content": c["content"],
                "status": "raw",
                "word_count": len(c["content"]),
            }
            for c in chapters
        ],
    }


def parse_epub_file(file_path: str) -> dict:
    try:
        import ebooklib
        from ebooklib import epub
    except ImportError:
        raise RuntimeError("ebooklib not installed: pip install ebooklib")

    book = epub.read_epub(file_path)
    title = book.get_metadata("DC", "title")
    title = title[0][0] if title else Path(file_path).stem
    author = book.get_metadata("DC", "creator")
    author = author[0][0] if author else "Khuyết danh"

    chapters = []
    for i, item in enumerate(book.get_items_of_type(ebooklib.ITEM_DOCUMENT)):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(item.get_content(), "html.parser")
        paragraphs = [p.get_text().strip() for p in soup.find_all(["p", "div"]) if p.get_text().strip()]
        content = "\n\n".join(paragraphs)
        if len(content) > 20:
            heading = soup.find(["h1", "h2", "h3", "title"])
            chap_title = heading.get_text().strip() if heading else f"Chương {i + 1}"
            chapters.append({
                "number": len(chapters) + 1,
                "title": chap_title,
                "original_content": content,
                "status": "raw",
                "word_count": len(content),
            })

    full_text = "\n".join(c["original_content"] for c in chapters)
    return {
        "title": title,
        "author": author,
        "detected_language": detect_language(full_text[:1000]),
        "chapters": chapters or [{"number": 1, "title": title, "original_content": "", "status": "raw", "word_count": 0}],
    }


def parse_pdf_file(file_path: str) -> dict:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF not installed: pip install PyMuPDF")

    doc = fitz.open(file_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n\n"

    title = Path(file_path).stem
    chapters = split_chapters(full_text)
    return {
        "title": title,
        "author": "Khuyết danh",
        "detected_language": detect_language(full_text[:500]),
        "chapters": [
            {"number": c["number"], "title": c["title"], "original_content": c["content"], "status": "raw", "word_count": len(c["content"])}
            for c in chapters
        ],
    }


def parse_docx_file(file_path: str) -> dict:
    try:
        from docx import Document
    except ImportError:
        raise RuntimeError("python-docx not installed: pip install python-docx")

    doc = Document(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    full_text = "\n\n".join(paragraphs)
    title = Path(file_path).stem
    chapters = split_chapters(full_text)
    return {
        "title": title,
        "author": "Khuyết danh",
        "detected_language": detect_language(full_text[:500]),
        "chapters": [
            {"number": c["number"], "title": c["title"], "original_content": c["content"], "status": "raw", "word_count": len(c["content"])}
            for c in chapters
        ],
    }


def parse_file(file_path: str, custom_regex: str | None = None) -> dict:
    ext = Path(file_path).suffix.lower()
    if ext == ".txt":
        return parse_txt_file(file_path, custom_regex)
    elif ext == ".epub":
        return parse_epub_file(file_path)
    elif ext == ".pdf":
        return parse_pdf_file(file_path)
    elif ext == ".docx":
        return parse_docx_file(file_path)
    else:
        return parse_txt_file(file_path, custom_regex)
```

- [ ] **Step 4: Install chardet if needed + run tests**

```bash
cd "H:/New folder (2)/backend"
pip install chardet
python -m pytest tests/test_parser.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd "H:/New folder (2)"
git add backend/services/parser.py backend/tests/test_parser.py
git commit -m "feat: parser service - TXT, EPUB, PDF, DOCX with language detection"
```

---

### Task 10: Translate + Parse Routers

**Files:**
- Create: `backend/routers/translate.py`
- Create: `backend/routers/parse.py`

**Interfaces:**
- Consumes: `services.translator.translate_text`, `services.parser.parse_file`, `database.get_db`
- Produces: `POST /api/translate`, `POST /api/projects/{id}/translate-batch`, `POST /api/parse`

- [ ] **Step 1: Write translate router**

```python
# backend/routers/translate.py
import uuid
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import aiosqlite

from database import get_db
from models import TranslateRequest, TranslateResponse, BatchTranslateRequest, ChapterResponse
from services.translator import translate_text
from services.glossary import apply_pre_glossary

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=TranslateResponse)
async def translate(body: TranslateRequest):
    result = await translate_text(
        text=body.text,
        source_lang=body.source_lang,
        target_lang=body.target_lang,
        settings={
            "provider": body.provider,
            "api_key": body.api_key,
            "custom_endpoint": body.custom_endpoint,
            "model": body.model,
            "style_prompt": body.style_prompt,
            "custom_prompt": body.custom_prompt,
            "temperature": body.temperature,
            "apply_glossary": body.apply_glossary,
        },
        glossary=body.glossary,
    )
    return result


@router.post("/projects/{project_id}/translate-batch", response_model=list[ChapterResponse])
async def translate_batch(
    project_id: str,
    body: BatchTranslateRequest,
    db: aiosqlite.Connection = Depends(get_db),
):
    # Verify project
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    project = await cursor.fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project = dict(project)
    settings = __import__("json").loads(project.get("settings_json", "{}"))

    # Fetch glossary
    cursor = await db.execute("SELECT * FROM glossary WHERE project_id = ?", (project_id,))
    glossary = [dict(r) for r in await cursor.fetchall()]

    # Fetch chapters
    placeholders = ",".join("?" * len(body.chapter_ids))
    cursor = await db.execute(
        f"SELECT * FROM chapters WHERE id IN ({placeholders}) AND project_id = ?",
        body.chapter_ids + [project_id],
    )
    chapters = [dict(r) for r in await cursor.fetchall()]

    for chap in chapters:
        # Update status to translating
        await db.execute("UPDATE chapters SET status = 'translating' WHERE id = ?", (chap["id"],))
        await db.commit()

        try:
            result = await translate_text(
                text=chap["original_content"],
                source_lang=project.get("source_language", "zh-CN"),
                target_lang=project.get("target_language", "vi"),
                settings=settings,
                glossary=glossary,
            )
            await db.execute(
                "UPDATE chapters SET translated_content = ?, status = 'translated' WHERE id = ?",
                (result["translated_text"], chap["id"]),
            )
        except Exception as e:
            await db.execute(
                "UPDATE chapters SET status = 'error' WHERE id = ?",
                (chap["id"],),
            )
            print(f"Batch translate error on {chap['title']}: {e}")

        await db.commit()

    # Return updated chapters
    cursor = await db.execute(
        f"SELECT * FROM chapters WHERE id IN ({placeholders}) AND project_id = ? ORDER BY number",
        body.chapter_ids + [project_id],
    )
    return [dict(r) for r in await cursor.fetchall()]
```

- [ ] **Step 2: Write parse router**

```python
# backend/routers/parse.py
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from models import ParsedNovelData
from services.parser import parse_file

router = APIRouter(tags=["parse"])


@router.post("/parse", response_model=ParsedNovelData)
async def parse_upload(
    file: UploadFile = File(...),
    custom_regex: Optional[str] = Form(None),
):
    # Save uploaded file to temp
    suffix = os.path.splitext(file.filename or "upload.txt")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = parse_file(tmp_path, custom_regex)
        return result
    finally:
        os.unlink(tmp_path)
```

- [ ] **Step 3: Verify server starts with new routers**

```bash
cd "H:/New folder (2)/backend"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Expected: Server starts, POST /api/translate and POST /api/parse are available

- [ ] **Step 4: Commit**

```bash
cd "H:/New folder (2)"
git add backend/routers/translate.py backend/routers/parse.py
git commit -m "feat: translate and parse routers with batch support"
```

---

### Task 11: Frontend API Client + Vite Proxy

**Files:**
- Modify: `vite.config.ts`
- Create: `src/services/api.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: All backend API endpoints
- Produces: `api.*` functions for frontend use

- [ ] **Step 1: Edit vite.config.ts — add proxy**

Replace the `server` section in `vite.config.ts`:

```typescript
// vite.config.ts — add inside defineConfig
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

- [ ] **Step 2: Create src/services/api.ts**

```typescript
// src/services/api.ts
const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export interface ProjectSummary {
  id: string;
  title: string;
  author: string;
  updated_at: number;
}

export interface FullProject extends ProjectSummary {
  source_language: string;
  target_language: string;
  settings_json: string;
  created_at: number;
  chapters: ChapterData[];
  glossary: GlossaryData[];
}

export interface ChapterData {
  id: string;
  project_id: string;
  number: number;
  title: string;
  original_content: string;
  converted_content?: string;
  translated_content?: string;
  status: string;
  word_count?: number;
}

export interface GlossaryData {
  id: string;
  project_id: string;
  source_term: string;
  target_term: string;
  category: string;
  enabled: boolean;
}

export interface ParsedNovelData {
  title: string;
  author: string;
  detected_language: string;
  chapters: {
    number: number;
    title: string;
    original_content: string;
    status: string;
    word_count: number;
  }[];
}

export interface TranslateResult {
  translated_text: string;
  provider_used: string;
  token_count?: number;
}

export const api = {
  // Projects
  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<FullProject>(`/projects/${id}`),
  createProject: (data: { title: string; author?: string; source_language?: string; target_language?: string }) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Record<string, any>) =>
    request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Chapters
  addChapter: (pid: string, data: { number: number; title: string; original_content: string }) =>
    request<ChapterData>(`/projects/${pid}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (pid: string, cid: string, data: Record<string, any>) =>
    request<ChapterData>(`/projects/${pid}/chapters/${cid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapter: (pid: string, cid: string) =>
    request<{ ok: boolean }>(`/projects/${pid}/chapters/${cid}`, { method: 'DELETE' }),

  // Glossary
  addGlossary: (pid: string, data: { source_term: string; target_term: string; category?: string }) =>
    request<GlossaryData>(`/projects/${pid}/glossary`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGlossary: (pid: string, itemId: string) =>
    request<{ ok: boolean }>(`/projects/${pid}/glossary/${itemId}`, { method: 'DELETE' }),

  // Processing
  parseFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ParsedNovelData>('/parse', { method: 'POST', body: form });
  },
  translate: (data: {
    text: string;
    source_lang?: string;
    target_lang?: string;
    provider?: string;
    api_key?: string;
    model?: string;
    style_prompt?: string;
    temperature?: number;
    apply_glossary?: boolean;
    glossary?: any[];
  }) => request<TranslateResult>('/translate', { method: 'POST', body: JSON.stringify(data) }),
  batchTranslate: (pid: string, chapterIds: string[], mode: 'ai' | 'vietphrase') =>
    request<ChapterData[]>(`/projects/${pid}/translate-batch`, { method: 'POST', body: JSON.stringify({ chapter_ids: chapterIds, mode }) }),
};
```

- [ ] **Step 3: Edit App.tsx — switch to API**

Replace the localStorage load with API fetch, add fallback. Key changes:

```typescript
// src/App.tsx — replace useEffect for loading
const [project, setProject] = useState<NovelProject>(() => {
  // Initial state only — data loaded from API
  return INITIAL_PROJECT;
});

const [projectId, setProjectId] = useState<string | null>(null);

// Load from API on mount
useEffect(() => {
  api.listProjects().then(async (projects) => {
    if (projects.length > 0) {
      const full = await api.getProject(projects[0].id);
      setProject({
        ...full,
        chapters: full.chapters || [],
        glossary: full.glossary || [],
        settings: JSON.parse(full.settings_json || '{}'),
      } as any);
      setProjectId(full.id);
    }
  }).catch(() => {
    // Offline fallback to localStorage
    const saved = localStorage.getItem('omni_novel_project');
    if (saved) {
      try { setProject(JSON.parse(saved)); } catch { /* ignore */ }
    }
  });
}, []);

// Sync to localStorage as backup
useEffect(() => {
  localStorage.setItem('omni_novel_project', JSON.stringify(project));
}, [project]);
```

Also update `handleStartBatch` to use `api.batchTranslate()` and `handleTranslateCurrentChapter` to use `api.translate()`.

- [ ] **Step 4: Verify frontend builds**

```bash
cd "H:/New folder (2)"
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
cd "H:/New folder (2)"
git add vite.config.ts src/services/api.ts src/App.tsx
git commit -m "feat: frontend API client + vite proxy, switch App.tsx to backend-first"
```

---

### Task 12: Integration Test

**Files:**
- Test the full flow end-to-end

- [ ] **Step 1: Start backend**

```bash
cd "H:/New folder (2)/backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

- [ ] **Step 2: Start frontend**

```bash
cd "H:/New folder (2)"
npm run dev
```

- [ ] **Step 3: Test API endpoints manually**

```bash
# Create project
curl -X POST http://localhost:8000/api/projects -H "Content-Type: application/json" -d '{"title": "Test Novel", "source_language": "zh-CN"}'

# List projects
curl http://localhost:8000/api/projects

# Parse a TXT file
curl -X POST http://localhost:8000/api/parse -F "file=@test.txt"

# Translate text (free)
curl -X POST http://localhost:8000/api/translate -H "Content-Type: application/json" -d '{"text": "你好世界", "provider": "free_google"}'
```

Expected: All endpoints return correct data

- [ ] **Step 4: Run all tests**

```bash
cd "H:/New folder (2)/backend"
python -m pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 5: Final commit**

```bash
cd "H:/New folder (2)"
git add -A
git commit -m "feat: Python Core Engine Phase 1 complete - full backend with API"
git push origin master
```

---

## Summary

| Task | Deliverable | Tests |
|------|-------------|-------|
| 1 | Backend scaffold + DB | Server starts, health endpoint |
| 2 | Pydantic models | Import check |
| 3 | Projects CRUD | 4 API tests |
| 4 | Chapters CRUD | 3 API tests |
| 5 | Glossary CRUD | 2 API tests |
| 6 | Chapter splitter | 4 unit tests |
| 7 | Glossary service | Import + manual check |
| 8 | Translator service | 2 unit tests (mocked) |
| 9 | Parser service | 4 unit tests |
| 10 | Translate + Parse routers | Integration test |
| 11 | Frontend API client | Build passes |
| 12 | Integration test | End-to-end flow |

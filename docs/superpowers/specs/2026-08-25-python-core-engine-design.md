# Python Core Engine — Phase 1 Design Spec

## Overview

Backend-first architecture for OmniNovel Studio. Python FastAPI server replaces client-side logic as the core processing engine. Frontend becomes a UI shell calling REST API.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| DB access | SQLite + raw SQL + aiosqlite | Lightweight, 0 ORM overhead, async native |
| API surface | Minimal CRUD | MVP scope, streaming adds later |
| Dev setup | Monorepo, 2 processes | Fast iteration, Docker Compose later |
| Architecture | Backend-first | Python does all processing, frontend is display + interaction |

## Project Structure

```
H:\New folder (2)/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, lifespan (DB init/close)
│   ├── database.py             # aiosqlite connection pool, schema creation
│   ├── models.py               # Pydantic models (request/response)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── projects.py         # /api/projects CRUD
│   │   ├── chapters.py         # /api/projects/{id}/chapters CRUD
│   │   ├── translate.py        # /api/translate, /api/projects/{id}/translate-batch
│   │   └── parse.py            # /api/parse (file upload → parsed JSON)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── translator.py       # Provider ABC + implementations
│   │   ├── parser.py           # File format parsers
│   │   ├── glossary.py         # Pre-glossary matching + post-validation
│   │   └── chapter_splitter.py # Regex-based auto chapter detection
│   ├── requirements.txt
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py         # Shared fixtures (test DB, mock HTTP)
│       ├── test_parser.py
│       ├── test_translator.py
│       └── test_api.py
├── src/                        # Existing React frontend (minimal changes)
│   └── services/
│       └── api.ts              # NEW — API client layer
├── vite.config.ts              # EDIT — add proxy /api → localhost:8000
└── package.json
```

## Database Schema

```sql
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
```

Status enum values: `raw`, `converting`, `converted`, `translating`, `translated`, `error`

Glossary category enum: `name`, `location`, `technique`, `item`, `general`

## API Endpoints

### Projects

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/projects` | `{title, author, source_language, target_language}` | Project object |
| `GET` | `/api/projects` | — | `[{id, title, author, updated_at}]` |
| `GET` | `/api/projects/{id}` | — | Full project + chapters + glossary |
| `PUT` | `/api/projects/{id}` | Partial project fields | Updated project |
| `DELETE` | `/api/projects/{id}` | — | `{ok: true}` |

### Chapters

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/projects/{id}/chapters` | `{number, title, original_content}` | Chapter object |
| `PUT` | `/api/projects/{id}/chapters/{chap_id}` | Partial chapter fields | Updated chapter |
| `DELETE` | `/api/projects/{id}/chapters/{chap_id}` | — | `{ok: true}` |

### Processing

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/parse` | `multipart/form-data` (file) | `{title, author, chapters[], source_language}` |
| `POST` | `/api/translate` | `{text, source_lang, target_lang, provider, settings, glossary[]}` | `{translated_text, provider_used}` |
| `POST` | `/api/projects/{id}/translate-batch` | `{chapter_ids[], mode: "ai"\|"vietphrase"}` | Updated chapters |

### Glossary

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/projects/{id}/glossary` | `{source_term, target_term, category}` | Glossary item |
| `DELETE` | `/api/projects/{id}/glossary/{item_id}` | — | `{ok: true}` |
| `PUT` | `/api/projects/{id}/glossary/{item_id}` | Partial item fields | Updated item |

## Translator Service

### Provider Pattern

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class TranslateResult:
    translated_text: str
    provider_used: str
    token_count: int | None = None

class TranslatorProvider(ABC):
    @abstractmethod
    async def translate(
        self, text: str, source_lang: str, target_lang: str,
        settings: dict, glossary: list[dict]
    ) -> TranslateResult: ...
```

### Implementations

| Provider | Class | Endpoint | Notes |
|----------|-------|----------|-------|
| `free_google` | `GoogleFreeTranslator` | `translate.googleapis.com` | No API key, 2000 char limit per chunk |
| `free_mymemory` | `MyMemoryTranslator` | `api.mymemory.translated.net` | No API key, 500 char limit |
| `gemini` | `GeminiTranslator` | `generativelanguage.googleapis.com` | Needs API key |
| `openai` | `OpenAITranslator` | Custom endpoint (default: `api.openai.com`) | Covers Ollama, LM Studio, any OpenAI-compatible |
| `deepseek` | `DeepSeekTranslator` | `api.deepseek.com` | Needs API key |
| `ollama` | `OllamaTranslator` | `localhost:11434` | Local LLM, no API key |

### Fallback Chain

If provider fails → try `free_google` → if also fails → return error to client.

### Glossary Integration

Pre-glossary: applied before sending to AI provider (same logic as current TypeScript `applyPreGlossary`).

System prompt: built from `style_prompt` + glossary list (ported from TypeScript `buildNovelSystemPrompt`).

## Parser Service

| Format | Library | Notes |
|--------|---------|-------|
| TXT | `codecs` + `chardet` | UTF-8, GBK, Big5, Shift-JIS auto-detect |
| EPUB | `ebooklib` | Parse OPF manifest, extract spine items |
| PDF | `PyMuPDF` (fitz) | Page-by-page text extraction |
| DOCX | `python-docx` | Extract paragraph text from document XML |

All parsers return `ParsedNovelData`:

```python
@dataclass
class ParsedNovelData:
    title: str
    author: str
    detected_language: str
    chapters: list[dict]  # [{number, title, original_content, status, word_count}]
```

Chapter splitting: ported `splitNovelChapters` regex from `src/services/dictionaries/vietphrase.ts`.

## Chapter Splitter

Regex-based detection, same patterns as current TypeScript:
- Chinese: `第[零一二三四五六七八九十百千万\d]+[章回节卷]`
- English: `Chapter \d+`, `CHAPTER \d+`
- Fallback: split on double newline if no chapter markers found

## Frontend Changes

### New File: `src/services/api.ts`

```typescript
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

export const api = {
  // Projects
  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<FullProject>(`/projects/${id}`),
  createProject: (data: CreateProject) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Chapters
  addChapter: (projectId: string, data: CreateChapter) => request<Chapter>(`/projects/${projectId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (projectId: string, chapId: string, data: Partial<Chapter>) => request<Chapter>(`/projects/${projectId}/chapters/${chapId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapter: (projectId: string, chapId: string) => request<void>(`/projects/${projectId}/chapters/${chapId}`, { method: 'DELETE' }),

  // Processing
  parseFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ParsedNovelData>('/parse', { method: 'POST', body: form });
  },
  translate: (data: TranslateRequest) => request<TranslateResult>('/translate', { method: 'POST', body: JSON.stringify(data) }),
  batchTranslate: (projectId: string, chapterIds: string[], mode: 'ai' | 'vietphrase') =>
    request<Chapter[]>(`/projects/${projectId}/translate-batch`, { method: 'POST', body: JSON.stringify({ chapter_ids: chapterIds, mode }) }),

  // Glossary
  addGlossary: (projectId: string, data: CreateGlossaryItem) => request<GlossaryItem>(`/projects/${projectId}/glossary`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGlossary: (projectId: string, itemId: string) => request<void>(`/projects/${projectId}/glossary/${itemId}`, { method: 'DELETE' }),
};
```

### Edit: `vite.config.ts`

Add proxy:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8000',
  },
},
```

### Edit: `src/App.tsx`

Switch from localStorage to API calls. localStorage becomes offline fallback:

```typescript
// Load project from API
useEffect(() => {
  api.getProject(projectId).then(setProject).catch(() => {
    // fallback to localStorage
    const saved = localStorage.getItem('omni_novel_project');
    if (saved) setProject(JSON.parse(saved));
  });
}, []);
```

## Error Handling

- All API errors return `{"detail": "message"}` (FastAPI default)
- HTTP status codes: 400 (bad input), 404 (not found), 422 (validation), 500 (server)
- Translation failures: catch in service, return error status in chapter, continue batch
- Parser failures: return partial results with error flags

## Testing

### Backend (pytest)

| Test File | Coverage |
|-----------|----------|
| `test_parser.py` | TXT parsing (UTF-8, GBK), EPUB parsing, chapter splitting |
| `test_translator.py` | Mock HTTP for each provider, glossary apply, fallback chain |
| `test_api.py` | CRUD endpoints via httpx AsyncClient, error cases |

### Setup

```python
# conftest.py
import pytest
import aiosqlite
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

## Dependencies

```
# backend/requirements.txt
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
aiosqlite>=0.20.0
httpx>=0.28.0
ebooklib>=0.18.0
PyMuPDF>=1.25.0
python-docx>=1.1.0
chardet>=5.2.0

# Dev/test
pytest>=8.0.0
pytest-asyncio>=0.24.0
```

## Implementation Order

1. `database.py` + schema creation
2. `models.py` (all Pydantic models)
3. `main.py` (FastAPI app, CORS, lifespan)
4. `routers/projects.py` + `routers/chapters.py` (CRUD)
5. `services/glossary.py`
6. `services/chapter_splitter.py`
7. `services/translator.py` (all providers)
8. `services/parser.py` (all formats)
9. `routers/translate.py` + `routers/parse.py`
10. `src/services/api.ts` + `vite.config.ts` proxy
11. Tests
12. Commit + push

## Scope Exclusions (Phase 2+)

- TTS integration (Piper, Edge TTS, XTTS-v2)
- Bilingual EPUB rendering
- Docker Compose setup
- CI/CD (GitHub Actions)
- WebSocket/SSE streaming
- SQLite migrations (Prisma or manual)
- Tauri desktop wrapper

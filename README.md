# OmniNovel Studio 📖

<p align="right">
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a> ·
  <strong>🇬🇧 English</strong>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Lacia1803/omninovel-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Lacia1803/omninovel-studio/actions/workflows/ci.yml)

**An all‑in‑one studio for translating, converting and publishing bilingual novels — with a consistent Glossary system and 5 AI providers.**

## 📖 Overview
OmniNovel Studio is a **standalone** (All‑in‑one Studio) solution that tackles the pain points of reading and translating web novels / ebooks (Chinese, Japanese, Korean, English):

- **Multi‑source translation**: Seamlessly switch or auto‑fallback between 5 quality translation providers.
- **Glossary smart‑prepend**: Lock down character names, locations and cultivation terms before sending to the AI — no more terminology drift between chapters.
- **Client‑side Vietphrase engine**: Runs entirely in the browser — no tokens, no network, zero latency.
- **Bilingual EPUB export**: High‑quality EPUB output with original text and translation interleaved.

## ✨ Highlights
- **5 quality translation providers**: Claude, OpenAI (GPT‑4o), Gemini, DeepSeek, Groq + Vietphrase client‑side engine.
- **Auto‑fallback**: Automatically switches to a backup provider on rate‑limit or network error — your progress is never lost.
- **4 translation styles**: Literary, Wuxia, Literal, Custom.
- **3‑column Pipeline view**: Side‑by‑side comparison of *Original*, *Vietphrase* and *AI Translation*. Edit or re‑translate any segment instantly.
- **Free Edge TTS integration**: 8 Neural voices from Microsoft Edge (Vietnamese, English, Japanese, Korean, Chinese) with adjustable speed and inline audio streaming.
- **Format & export**: TXT, EPUB, PDF, DOCX input; bilingual EPUB, Markdown and JSON output.

## 🛠️ Tech Stack
| Layer | Technologies / Libraries |
|-------|--------------------------|
| **Frontend** | React 19, Vite, TypeScript (strict), custom CSS |
| **Backend** | Python 3.11, FastAPI, `aiosqlite` |
| **Database** | SQLite (async) |
| **Parsers** | `chardet`, `PyMuPDF`, `python-docx`, `ebooklib` |
| **Audio & TTS** | Edge TTS client integration |
| **Security & Ops** | JWT auth, `bcrypt`, `slowapi` (rate limit), `loguru` (structured logging) |
| **Desktop / Container** | Tauri v2, Docker Compose (Nginx + FastAPI) |
| **Testing** | Vitest (frontend), Pytest (backend) |

## 🏗️ System Architecture
```mermaid
graph TB
subgraph "Frontend (React 19 + TypeScript)"
    UI[Editorial Ink UI] --> API[services/api.ts]
    UI --> Trans[translators/index.ts]
    UI --> Dict[dictionaries/vietphrase.ts]
    UI --> Exp[exporters/]
end
subgraph "Backend (FastAPI Service)"
    API -->|REST + JWT| BE[FastAPI Routers]
    BE --> DB[(SQLite Async)]
    BE --> TTS[Edge TTS Engine]
    BE --> Parser[Document Parsers]
end
subgraph "AI Providers & Services"
    Trans --> Gemini
    Trans --> OpenAI
    Trans --> Claude
    Trans --> DeepSeek
    Trans --> Groq
    Trans --> Vietphrase[Vietphrase Engine]
end
```

## 📂 Project Structure
```text
omninovel-studio/
├── frontend/               # React 19 + TypeScript frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Translators, parsers, exporters, API
│   │   └── types/          # TypeScript interfaces
│   ├── Dockerfile          # Docker image for frontend (nginx)
│   └── nginx.conf          # Reverse‑proxy config
├── backend/                # Python FastAPI backend
│   ├── main.py             # Entrypoint, CORS, middleware & handlers
│   ├── security.py         # JWT auth + bcrypt hashing
│   ├── database.py         # Async SQLite connection & schema
│   ├── models.py           # Pydantic schemas
│   ├── routers/            # API endpoints
│   └── services/           # Business logic
├── infra/                  # DevOps & testing infrastructure
│   ├── tauri/              # Desktop app (Tauri v2)
│   └── tests/              # E2E & integration tests
├── docs/                   # Documentation & design files
├── docker-compose.yml      # Orchestration for Nginx + FastAPI
└── README.md               # This file
```

## 🚀 Installation & Run
### 1. Local Development
**Backend**
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev
```

*Frontend*: `http://localhost:5173`  
*Backend API*: `http://localhost:8000/api`

### 2. Docker Compose (production‑ready)
```bash
docker compose up --build -d
```

Nginx serves the frontend on port 80 and proxies all `/api/*` requests to the backend on port 8000.

### 3. Desktop (Tauri v2)
```bash
cd infra/tauri
cargo tauri dev
```

## 🔑 AI Provider Setup
| Provider | Best For | API Key | Cost |
|----------|----------|---------|------|
| **Claude (Anthropic)** | Literary/creative translation, nuanced prose | [Anthropic Console](https://console.anthropic.com/api-keys) | Pay‑per‑use |
| **OpenAI (GPT‑4o / 4o‑mini)** | General high‑quality novel translation | [OpenAI API](https://platform.openai.com/api-keys) | Pay‑per‑use |
| **Gemini** | Free tier, good quality | [Google AI Studio](https://aistudio.google.com/apikey?authuser=1) | Free tier |
| **DeepSeek** | Cost‑effective, strong multilingual | [DeepSeek Platform](https://platform.deepseek.com/api-keys) | Very cheap |
| **Groq** | Ultra‑fast inference, free tier | [Groq Console](https://console.groq.com/keys) | Free tier |

> **Tip:** Start with **Gemini** (free tier) or **Groq** (free tier) for zero‑cost translation. For best literary quality, use **Claude** or **GPT‑4o**. **DeepSeek** offers the best price/performance for volume work.

## ⌨️ Default Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + I` | Open the **Import book** panel |
| `Ctrl + E` | Open the **Export** panel |
| `Ctrl + G` | Manage **Glossary** & terms |
| `Ctrl + ,` | Open **Settings** (API keys, theme…) |
| `Ctrl + /` | Toggle **Light / Dark** mode (Editorial Ink) |
| `Ctrl + Shift + B` | Open **Batch Translate** view |

## 🧪 Testing
```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm run test

# E2E tests
cd infra/tests && npx playwright test
```

All tests pass (PASS) before every commit.

## 📝 License
Released under the **MIT License**. See the [`LICENSE`](LICENSE) file for details.

---

*Built and maintained by **Lacia** – [GitHub Profile](https://github.com/Lacia1803).*
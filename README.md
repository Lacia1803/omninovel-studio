# OmniNovel Studio

> A web-based novel translation and conversion studio for all languages and formats.

## Overview

OmniNovel Studio is a full-stack translation studio for novels. It features a Python FastAPI backend for processing (file parsing, TTS, EPUB generation) and a React frontend for editing and reading.

**Architecture**: React frontend → Vite proxy → FastAPI backend → SQLite database.

Built with a distinctive editorial ink aesthetic — ivory paper, serif typography, vermilion accents — designed to feel like a proper manuscript editor.

## Features

### Translation
- **Multi-provider AI translation** — Gemini, OpenAI GPT-4o, DeepSeek, Ollama, and any OpenAI-compatible endpoint
- **Free translation** — Google Translate (unofficial) and MyMemory work without API keys
- **Glossary system** — maintain terminology consistency across chapters with pre-translation term replacement
- **Custom prompts** — control system prompts for different translation styles (literary, wuxia, literal, custom)
- **Batch processing** — translate multiple chapters sequentially with progress tracking

### Text-to-Speech (TTS)
- **Edge TTS** — free cloud neural TTS via Microsoft Edge
- 8 voices: Vietnamese (F/M), English (F/M), Japanese, Korean, Chinese (F/M)
- Adjustable speech rate
- Audio streaming to browser for immediate playback

### Format Support
| Input | Output |
|-------|--------|
| TXT, EPUB, PDF, DOCX | TXT, EPUB, PDF, DOCX, JSON |
| Auto chapter-split with regex | Bilingual EPUB (interleaved original + translation) |
| UTF-8, GBK, Big5, Shift-JIS detection | |

### Reading & Editing
- **Parallel dual view** — side-by-side original/translated comparison per paragraph
- **Reader mode** — distraction-free reading with adjustable font size and TTS playback
- **Find & replace** — bulk text replacement across all content fields
- **Chapter management** — add, delete, reorder, filter by translation status

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Backend | Python 3.11, FastAPI, aiosqlite |
| Database | SQLite (raw SQL, async) |
| TTS | Edge TTS (free, cloud) |
| Parsers | chardet, PyMuPDF, python-docx, ebooklib |
| Build | Vite + TypeScript strict mode |
| Lint | oxlint |
| Tests | Vitest (unit), Pytest (backend) |
| Container | Docker Compose (Nginx + FastAPI) |
| Desktop | Tauri v2 (optional) |

## Design System — Editorial Ink

- **Typography**: Playfair Display (headings) + Lora (body) + JetBrains Mono (code)
- **Palette**: Ivory paper (`#f5efe4`) / Sepia ink (`#2b1f15`) / Vermilion accent (`#c13828`) / Indigo (`#2c4870`) / Jade (`#4a7a5d`)
- **Texture**: SVG paper grain overlay
- **Borders**: Sharp, minimal radius — book-page aesthetic

## Getting Started

### Development (web)

```bash
# Backend
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
npm install
npm run dev
```

Frontend at `http://localhost:5173`, backend API at `http://localhost:8000/api`.

### Docker Compose

```bash
docker compose up --build
```

Frontend served via Nginx on port 80, API proxied to backend on port 8000.

### Desktop (Tauri)

Requires Rust. Install from [rustup.rs](https://rustup.rs), then:

```bash
npm install
npm run tauri:dev
```

## Project Structure

```
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── services/api.ts         # API client (REST → FastAPI)
│   ├── services/exporters/     # Client-side EPUB/PDF/DOCX/TXT export
│   └── types/                  # TypeScript types
├── backend/                    # Python FastAPI server
│   ├── main.py                 # App entry, CORS, router registration
│   ├── database.py             # SQLite schema + async helpers
│   ├── models.py               # Pydantic request/response schemas
│   ├── routers/                # API endpoints
│   │   ├── projects.py         # CRUD + batch translate
│   │   ├── chapters.py         # CRUD
│   │   ├── glossary.py         # CRUD
│   │   ├── translate.py        # Single-text translation
│   │   ├── parse.py            # File upload + parse
│   │   ├── tts.py              # Text-to-speech
│   │   └── bilingual.py        # Bilingual EPUB export
│   ├── services/               # Business logic
│   │   ├── translator.py       # Multi-provider translation engine
│   │   ├── parser.py           # TXT/EPUB/PDF/DOCX parsers
│   │   ├── chapter_splitter.py # Regex chapter detection
│   │   ├── glossary.py         # Pre-translation term replacement
│   │   ├── tts.py              # Edge TTS integration
│   │   └── bilingual_epub.py   # Bilingual EPUB generator
│   └── tests/                  # Pytest tests
├── src-tauri/                  # Tauri desktop wrapper (optional)
├── docker-compose.yml          # Production deployment
├── Dockerfile                  # Frontend (Nginx)
├── backend/Dockerfile          # Backend (Python)
└── nginx.conf                  # SPA routing + API proxy
```

## License

MIT

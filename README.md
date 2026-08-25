# OmniNovel Studio

> A web-based novel translation and conversion studio for all languages and formats.

## Overview

OmniNovel Studio is a browser-based translation studio that handles novel conversion and AI translation across all languages and formats. It supports Vietnamese, Chinese (Simplified/Traditional), Japanese, Korean, and English with automatic language detection.

Built with a distinctive editorial ink aesthetic — ivory paper, serif typography, vermilion accents — designed to feel like a proper manuscript editor, not another generic AI tool.

## Features

### Translation
- **Multi-provider AI translation** — Gemini, OpenAI GPT-4o, DeepSeek, and any OpenAI-compatible local LLM (Ollama, LM Studio, llama.cpp, vLLM)
- **Vietphrase converter** — client-side dictionary engine for Chinese→Vietnamese conversion using Longest Match Replacement algorithm
- **Free translation** — Google Translate and MyMemory work without API keys
- **Glossary system** — maintain terminology consistency across thousands of chapters with presets for Xianxia, Wuxia, and general fiction
- **Custom prompts** — full control over system prompts for different translation styles (literary, wuxia/ancient, literal, custom)
- **Batch processing** — translate multiple chapters sequentially with progress tracking

### Format Support
| Input | Output |
|-------|--------|
| TXT, EPUB, PDF, DOCX, JSON | TXT, EPUB, PDF, DOCX, JSON |
| HTML paste, direct text | Bilingual EPUB, interleaved mode |
| Chapter auto-split with regex | Metadata preservation |

### Reading & Editing
- **Parallel dual view** — side-by-side original/translated comparison per paragraph
- **Reader mode** — distraction-free reading with 4 themes (dark, light, sepia, forest), adjustable font size
- **Find & replace** — bulk text replacement across all content fields
- **Chapter management** — add, delete, reorder, filter by translation status

### Vietnamese Hán-Việt Engine
- 100+ character Han-Viet dictionary covering common literary and martial arts terms
- 50+ Vietphrase compound phrases for instant Chinese→Vietnamese conversion
- Watermark/ad URL auto-cleaning for web novel sources
- Custom glossary override (higher priority than built-in dictionary)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Styling | CSS (editorial ink design system) |
| Icons | Lucide React |
| Parsers | epubjs, pdf.js, docx, jszip |
| Translators | Gemini API, OpenAI API, DeepSeek API, Google Translate (free) |
| Build | Vite + TypeScript strict mode |
| Lint | oxlint |

## Design System — Editorial Ink

The UI uses a custom design system inspired by traditional East Asian manuscript aesthetics:

- **Typography**: Playfair Display (headings) + Lora (body) + JetBrains Mono (code)
- **Palette**: Ivory paper (`#f5efe4`) / Sepia ink (`#2b1f15`) / Vermilion accent (`#c13828`) / Indigo (`#2c4870`) / Jade (`#4a7a5d`)
- **Texture**: SVG paper grain overlay
- **Borders**: Sharp, minimal radius — book-page aesthetic
- **Badges**: Wax-seal-style uppercase labels

## Getting Started

```bash
npm install
npm run dev
```

The app runs entirely in the browser — no server required. API keys are stored locally in the browser and never sent to any third-party server.

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Navbar.tsx
│   ├── ChapterSidebar.tsx
│   ├── DualEditor.tsx
│   ├── ImportModal.tsx
│   ├── ExportModal.tsx
│   ├── SettingsModal.tsx
│   ├── GlossaryManager.tsx
│   ├── BatchTranslator.tsx
│   └── ReaderMode.tsx
├── services/            # Business logic
│   ├── parsers/         # File format parsers (EPUB, PDF, DOCX, TXT)
│   ├── translators/     # Translation provider adapters
│   ├── dictionaries/    # Vietphrase & Han-Viet dictionary engine
│   └── exporters/       # Output formatters (EPUB, PDF, DOCX, TXT, JSON)
├── types/               # TypeScript type definitions
└── App.tsx              # Application root
```

## License

MIT

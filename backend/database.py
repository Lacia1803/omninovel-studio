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

CREATE TABLE IF NOT EXISTS chapter_notes (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    note TEXT DEFAULT '',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_chapter ON chapter_notes(chapter_id);
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
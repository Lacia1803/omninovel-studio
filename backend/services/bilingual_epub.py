"""Bilingual EPUB Export Service — generate interleaved bilingual EPUB from translated chapters."""
from pathlib import Path
from typing import Optional
import html
import re

from ebooklib import epub
from bs4 import BeautifulSoup

from models import ChapterResponse as ChapterData


def sanitize_filename(name: str) -> str:
    """Sanitize string for safe filename."""
    return re.sub(r'[<>:"/\\|?*]', '_', name)


def clean_html_content(content: str) -> str:
    """Clean and normalize HTML content from parser."""
    if not content:
        return ""
    # Parse with BeautifulSoup to clean up
    soup = BeautifulSoup(content, 'html.parser')
    # Remove any script/style tags
    for tag in soup(['script', 'style']):
        tag.decompose()
    return str(soup)


def create_bilingual_epub(
    project_title: str,
    project_author: str,
    chapters: list[ChapterData],
    source_lang: str = "en",
    target_lang: str = "vi",
    cover_image: Optional[bytes] = None,
) -> bytes:
    """
    Generate a bilingual EPUB with interleaved original and translated text.

    Each chapter becomes a section with:
    - Chapter title
    - Original content (source language)
    - Translated content (target language)
    """
    book = epub.EpubBook()

    # Metadata
    book.set_identifier(f"omninovel-{project_title.lower().replace(' ', '-')}")
    book.set_title(project_title)
    book.set_language(source_lang)
    book.add_author(project_author)
    book.add_metadata('DC', 'description', f'Bilingual edition: {project_title} ({source_lang}/{target_lang})')

    # Cover image if provided
    if cover_image:
        book.set_cover("cover.jpg", cover_image)

    # CSS for bilingual styling
    css = epub.EpubItem(
        uid="style_bilingual",
        file_name="style/bilingual.css",
        media_type="text/css",
        content="""
body { font-family: Georgia, serif; line-height: 1.6; margin: 2em; }
h1 { text-align: center; font-size: 2em; margin-bottom: 0.5em; }
h2 { text-align: center; font-size: 1.5em; margin-top: 2em; margin-bottom: 1em; color: #333; }
.chapter-title { text-align: center; font-size: 1.8em; font-weight: bold; margin: 2em 0 1em; }
.source-text { color: #1a1a1a; }
.target-text { color: #2c5f8a; font-style: italic; margin-top: 1em; padding-left: 1em; border-left: 3px solid #2c5f8a; }
.paragraph-pair { margin-bottom: 1.5em; }
.source-lang-label { font-size: 0.85em; font-weight: bold; color: #666; margin-bottom: 0.3em; text-transform: uppercase; }
.target-lang-label { font-size: 0.85em; font-weight: bold; color: #2c5f8a; margin: 1em 0 0.3em; text-transform: uppercase; }
p { margin: 0.5em 0; text-align: justify; }
hr.chapter-divider { border: none; border-top: 1px solid #ccc; margin: 3em 0; }
""",
    )
    book.add_item(css)

    # Create chapters
    epub_chapters = []
    toc = []
    spine = ['nav']

    for i, chapter in enumerate(chapters):
        # Get content - prefer converted_content if available, else original
        original = chapter.converted_content or chapter.original_content or ""
        translated = chapter.translated_content or ""

        # Clean HTML
        original = clean_html_content(original)
        translated = clean_html_content(translated)

        # Build bilingual content
        content_parts = []

        # Chapter title
        title = chapter.title or f"Chapter {chapter.number}"
        content_parts.append(f'<h1 class="chapter-title">{html.escape(title)}</h1>')

        # If both original and translated exist, interleave by paragraphs
        if original and translated:
            # Split into paragraphs
            orig_paragraphs = [p.strip() for p in original.split('\n') if p.strip()]
            trans_paragraphs = [p.strip() for p in translated.split('\n') if p.strip()]

            # Pair paragraphs (assume 1:1 mapping after translation)
            max_paras = max(len(orig_paragraphs), len(trans_paragraphs))

            for j in range(max_paras):
                content_parts.append('<div class="paragraph-pair">')

                if j < len(orig_paragraphs):
                    content_parts.append(f'<div class="source-lang-label">{source_lang.upper()}</div>')
                    content_parts.append(f'<p class="source-text">{orig_paragraphs[j]}</p>')

                if j < len(trans_paragraphs):
                    content_parts.append(f'<div class="target-lang-label">{target_lang.upper()}</div>')
                    content_parts.append(f'<p class="target-text">{trans_paragraphs[j]}</p>')

                content_parts.append('</div>')
        elif original:
            content_parts.append(f'<div class="source-lang-label">{source_lang.upper()}</div>')
            # Wrap in paragraphs if not already
            if not original.startswith('<'):
                paragraphs = [p.strip() for p in original.split('\n') if p.strip()]
                for p in paragraphs:
                    content_parts.append(f'<p class="source-text">{p}</p>')
            else:
                content_parts.append(original)
        elif translated:
            content_parts.append(f'<div class="target-lang-label">{target_lang.upper()}</div>')
            if not translated.startswith('<'):
                paragraphs = [p.strip() for p in translated.split('\n') if p.strip()]
                for p in paragraphs:
                    content_parts.append(f'<p class="target-text">{p}</p>')
            else:
                content_parts.append(translated)

        chapter_content = '\n'.join(content_parts)

        # Create EPUB chapter
        epub_chapter = epub.EpubHtml(
            title=title,
            file_name=f"chapter_{chapter.number:04d}.xhtml",
            lang=source_lang,
        )
        epub_chapter.content = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="{source_lang}">
<head>
    <title>{html.escape(title)}</title>
    <link rel="stylesheet" href="style/bilingual.css" type="text/css" />
</head>
<body>
{chapter_content}
</body>
</html>"""

        book.add_item(epub_chapter)
        epub_chapters.append(epub_chapter)
        toc.append(epub_chapter)
        spine.append(epub_chapter)

    # Table of Contents
    book.toc = toc
    book.spine = spine

    # Add navigation files
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Write to bytes
    import io
    buffer = io.BytesIO()
    epub.write_epub(buffer, book, {})
    return buffer.getvalue()


def create_bilingual_epub_from_db(
    db_path: str,
    project_id: str,
    output_path: Optional[str] = None,
) -> bytes:
    """
    Generate bilingual EPUB directly from database.
    Reads project and chapters from SQLite.
    """
    import aiosqlite

    async def _generate():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row

            # Get project
            async with db.execute(
                "SELECT * FROM projects WHERE id = ?", (project_id,)
            ) as cursor:
                project = await cursor.fetchone()
                if not project:
                    raise ValueError(f"Project {project_id} not found")

            # Get chapters
            async with db.execute(
                "SELECT * FROM chapters WHERE project_id = ? ORDER BY number",
                (project_id,)
            ) as cursor:
                chapters = await cursor.fetchall()

            # Convert to ChapterData objects
            chapter_data = [
                ChapterData(
                    id=row["id"],
                    project_id=row["project_id"],
                    number=row["number"],
                    title=row["title"],
                    original_content=row["original_content"],
                    converted_content=row["converted_content"],
                    translated_content=row["translated_content"],
                    status=row["status"],
                    word_count=row["word_count"],
                )
                for row in chapters
            ]

            return create_bilingual_epub(
                project_title=project["title"],
                project_author=project["author"] or "Unknown",
                chapters=chapter_data,
                source_lang=project["source_language"] or "en",
                target_lang=project["target_language"] or "vi",
            )

    # For sync usage (CLI), run async
    import asyncio
    return asyncio.run(_generate())


# CLI entry point
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python -m backend.services.bilingual_epub <db_path> <project_id> [output.epub]")
        sys.exit(1)

    db_path = sys.argv[1]
    project_id = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else f"bilingual_{project_id}.epub"

    try:
        epub_bytes = create_bilingual_epub_from_db(db_path, project_id)
        with open(output_path, "wb") as f:
            f.write(epub_bytes)
        print(f"Bilingual EPUB written to {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
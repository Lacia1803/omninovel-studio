import os
import re
from pathlib import Path

import chardet

from services.chapter_splitter import split_chapters


def detect_language(text: str) -> str:
    if not text:
        return "zh-CN"
    if re.search(r"[぀-ヿ]", text) and len(re.findall(r"[぀-ヿ]", text)) > 5:
        return "ja"
    if re.search(r"[가-힯]", text) and len(re.findall(r"[가-힯]", text)) > 5:
        return "ko"
    if re.search(r"[一-龥]", text) and len(re.findall(r"[一-龥]", text)) > len(text) * 0.1:
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
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("ebooklib/beautifulsoup4 not installed")

    book = epub.read_epub(file_path)
    title = book.get_metadata("DC", "title")
    title = title[0][0] if title else Path(file_path).stem
    author = book.get_metadata("DC", "creator")
    author = author[0][0] if author else "Khuyết danh"

    chapters = []
    for i, item in enumerate(book.get_items_of_type(ebooklib.ITEM_DOCUMENT)):
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
        import fitz
    except ImportError:
        raise RuntimeError("PyMuPDF not installed")

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
        raise RuntimeError("python-docx not installed")

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

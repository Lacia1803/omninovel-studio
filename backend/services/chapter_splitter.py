import re


CHAPTER_PATTERNS = [
    r"^第[零一二三四五六七八九十百千万\d]+[章回节卷].*$",
    r"^Chapter\s+\d+.*$",
    r"^CHAPTER\s+\d+.*$",
    r"^Chương\s+\d+.*$",
    r"^CHƯƠNG\s+\d+.*$",
]


def split_chapters(text: str, custom_regex: str | None = None) -> list[dict]:
    if not text or not text.strip():
        return [{"number": 1, "title": "Untitled", "content": text or ""}]

    patterns = [re.compile(custom_regex, re.MULTILINE)] if custom_regex else [re.compile(p, re.MULTILINE) for p in CHAPTER_PATTERNS]

    markers: list[tuple[int, str]] = []
    for line in text.split("\n"):
        line_stripped = line.strip()
        for pattern in patterns:
            if pattern.match(line_stripped):
                markers.append((text.find(line_stripped), line_stripped))
                break

    markers = list({m[1]: m for m in markers}.values())
    markers.sort(key=lambda m: m[0])

    if not markers:
        return [{"number": 1, "title": "Nội dung", "content": text.strip()}]

    chapters = []
    for i, (pos, title) in enumerate(markers):
        line_end = text.index("\n", pos) + 1 if "\n" in text[pos:] else len(text)
        content_start = line_end

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

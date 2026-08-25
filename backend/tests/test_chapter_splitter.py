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

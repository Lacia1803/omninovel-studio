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

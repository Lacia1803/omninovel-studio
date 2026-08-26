"""Backend feature tests for OmniNovel Studio."""
import io
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.fixture
def client():
    return TestClient(app)


def _create_test_project_and_chapter(client):
    # Create a project
    project_resp = client.post(
        "/api/projects",
        json={
            "title": "Test Project",
            "author": "Test Author",
            "source_language": "en",
            "target_language": "vi",
        },
    )
    assert project_resp.status_code == 200, project_resp.text
    project_id = project_resp.json()["id"]

    # Create a chapter
    chapter_resp = client.post(
        f"/api/projects/{project_id}/chapters",
        json={
            "number": 1,
            "title": "Test Chapter",
            "original_content": "Original content line 1\nOriginal content line 2",
        },
    )
    assert chapter_resp.status_code in (200, 201), chapter_resp.text
    chapter_id = chapter_resp.json()["id"]

    # Update chapter with translated content (POST doesn't accept it)
    client.put(
        f"/api/projects/{project_id}/chapters/{chapter_id}",
        json={
            "translated_content": "Nội dung bản dịch 1\nNội dung bản dịch 2",
            "status": "translated",
        },
    )

    return project_id, chapter_id


def test_create_note(client):
    """Test creating a chapter note."""
    client_id, chapter_id = _create_test_project_and_chapter(client)

    response = client.post(
        f"/api/projects/{client_id}/chapters/{chapter_id}/notes",
        json={
            "note": "This is a test note for chapter 1",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["note"] == "This is a test note for chapter 1"
    assert data["chapter_id"] == chapter_id


def test_export_bilingual_epub(client):
    """Test exporting bilingual EPUB."""
    client_id, chapter_id = _create_test_project_and_chapter(client)

    response = client.get(
        f"/api/projects/{client_id}/export/bilingual-epub"
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/epub+zip"
    # EPUB is a ZIP file — verify ZIP magic bytes and EPUB structure
    content = response.content
    assert content[:2] == b'PK'  # ZIP magic bytes
    assert b'EPUB/content.opf' in content
    assert b'mimetype' in content


class _AsyncStream:
    """Async iterator mock for edge_tts.Communicate.stream."""
    def __init__(self, chunks):
        self._chunks = chunks
    def __aiter__(self):
        return self
    async def __anext__(self):
        if self._chunks:
            return self._chunks.pop(0)
        raise StopAsyncIteration


def test_tts_generate(client):
    """Test TTS generation endpoint."""
    client_id, chapter_id = _create_test_project_and_chapter(client)

    # Mock Edge TTS to avoid real network calls
    with patch('edge_tts.Communicate') as mock_communicate:
        mock_communicate.return_value.stream = MagicMock(
            return_value=_AsyncStream([
                {"type": "audio", "data": b"fake_audio_data_1"},
                {"type": "audio", "data": b"fake_audio_data_2"},
            ])
        )

        response = client.post(
            "/api/tts",
            json={
                "text": "Hello world",
                "voice": "vi-VN-HoaiMyNeural",
                "rate": "+0%",
            },
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        assert isinstance(response.content, bytes)
        assert len(response.content) > 0


def test_export_markdown(client):
    """Test exporting chapter content as Markdown."""
    client_id, chapter_id = _create_test_project_and_chapter(client)

    response = client.get(
        f"/api/projects/{client_id}/export/markdown",
        params={"content_type": "translated"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/markdown;charset=utf-8"
    content = response.text
    # Verify markdown content includes chapter title and translated text
    assert "# Test Chapter" in content
    assert "Nội dung bản dịch 1" in content
    assert "Nội dung bản dịch 2" in content
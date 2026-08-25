import pytest
from unittest.mock import AsyncMock, patch
from services.translator import translate_text, TranslateResult


@pytest.mark.asyncio
async def test_glossary_apply_before_translate():
    glossary = [
        {"source_term": "老祖", "target_term": "Lão Tổ", "enabled": True},
    ]
    with patch("services.translator.GoogleFreeTranslator.translate", new_callable=AsyncMock) as mock:
        mock.return_value = TranslateResult(translated_text="mock", provider_used="mock")
        result = await translate_text("老祖说话", "zh-CN", "vi", {"provider": "free_google", "apply_glossary": True}, glossary)
        call_args = mock.call_args
        assert "Lão Tổ" in call_args[0][0]


@pytest.mark.asyncio
async def test_empty_text_returns_empty():
    result = await translate_text("", "zh-CN", "vi", {"provider": "free_google"})
    assert result["translated_text"] == ""

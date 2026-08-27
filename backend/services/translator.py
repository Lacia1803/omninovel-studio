import httpx
from urllib.parse import urlparse
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict

from services.glossary import apply_pre_glossary

# Allowed hostnames for custom endpoints (SSRF protection)
ALLOWED_ENDPOINT_HOSTS = {
    "api.openai.com", "api.deepseek.com", "api.anthropic.com",
    "api.mistral.ai", "api.cohere.ai", "api.groq.com",
    "generativelanguage.googleapis.com",
    "localhost", "127.0.0.1",  # Ollama local
}


def validate_endpoint(url: str, default_url: str) -> str:
    """Return url if it's on the allowlist, otherwise fall back to default_url."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host in ALLOWED_ENDPOINT_HOSTS:
        return url
    return default_url


@dataclass
class TranslateResult:
    translated_text: str
    provider_used: str
    token_count: int | None = None

    def to_dict(self):
        return asdict(self)


STYLE_PROMPTS = {
    "literary": "Dịch mượt mà, văn phong tiểu thuyết Tiếng Việt bay bổng, tự nhiên, thoát nghĩa nhưng giữ nguyên nội dung gốc.",
    "wuxia": "Dịch theo phong cách Tiên hiệp/Kiếm hiệp/Ngôn tình cổ đại. Sử dụng từ Hán Việt sang trọng, chuẩn xưng hô (huynh, đệ, tỷ, muội, sư tôn, lão tổ...).",
    "literal": "Dịch sát nghĩa từng câu, giữ nguyên cấu trúc câu để đối chiếu học thuật.",
}


def build_novel_system_prompt(settings: dict, glossary: list[dict] | None = None) -> str:
    style_key = settings.get("style_prompt", "literary")
    if style_key == "custom":
        style_instruction = settings.get("custom_prompt", "Dịch sang Tiếng Việt mượt mà, chuẩn văn phong truyện chữ.")
    else:
        style_instruction = STYLE_PROMPTS.get(style_key, STYLE_PROMPTS["literary"])

    glossary_instruction = ""
    if settings.get("apply_glossary") and glossary:
        active = [g for g in glossary if g.get("enabled", True)]
        if active:
            lines = [f'- "{g["source_term"]}" -> "{g["target_term"]}"' for g in active]
            glossary_instruction = f"\nBẮT BUỘC tuân thủ bảng thuật ngữ/tên nhân vật sau:\n" + "\n".join(lines) + "\n"

    return f"""Bạn là một dịch giả tiểu thuyết chuyên nghiệp. Nhiệm vụ của bạn là dịch đoạn văn bản truyện sau đây sang Tiếng Việt.
- Yêu cầu phong cách: {style_instruction}
- Giữ nguyên định dạng các đoạn văn, xuống dòng, dấu câu.
- Không tự ý thêm bớt các tình tiết hoặc lời bình luận cá nhân.
{glossary_instruction}
Chỉ trả về duy nhất nội dung văn bản đã dịch."""


def split_text_into_chunks(text: str, max_length: int) -> list[str]:
    if len(text) <= max_length:
        return [text]
    paragraphs = text.split("\n")
    chunks, current = [], ""
    for p in paragraphs:
        if len(current) + len(p) + 1 > max_length:
            if current:
                chunks.append(current)
            current = p
        else:
            current = f"{current}\n{p}" if current else p
    if current:
        chunks.append(current)
    return chunks


class TranslatorProvider(ABC):
    @abstractmethod
    async def translate(self, text: str, source_lang: str, target_lang: str,
                        settings: dict, glossary: list[dict]) -> TranslateResult: ...


class GoogleFreeTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        chunks = split_text_into_chunks(text, 1800)
        results = []
        async with httpx.AsyncClient(timeout=30) as client:
            for chunk in chunks:
                sl = source_lang if source_lang != "auto" else "auto"
                url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={target_lang}&dt=t&q={chunk}"
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                translated = ""
                if data and data[0]:
                    for item in data[0]:
                        if item and item[0]:
                            translated += item[0]
                results.append(translated or chunk)
        return TranslateResult(
            translated_text="\n".join(results),
            provider_used="Google Translate (Free)",
        )


class MyMemoryTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        chunks = split_text_into_chunks(text, 500)
        results = []
        src = "zh" if source_lang == "auto" else source_lang
        async with httpx.AsyncClient(timeout=30) as client:
            for chunk in chunks:
                url = f"https://api.mymemory.translated.net/get?q={chunk}&langpair={src}|{target_lang}"
                resp = await client.get(url)
                data = resp.json()
                results.append(data.get("responseData", {}).get("translatedText", chunk))
        return TranslateResult(
            translated_text="\n".join(results),
            provider_used="MyMemory (Free)",
        )


class OpenAICompatibleTranslator(TranslatorProvider):
    def __init__(self, default_endpoint: str, default_model: str, provider_name: str):
        self.default_endpoint = default_endpoint
        self.default_model = default_model
        self.provider_name = provider_name

    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError(f"API Key required for {self.provider_name}")

        endpoint = validate_endpoint(
            settings.get("custom_endpoint") or self.default_endpoint,
            self.default_endpoint,
        )
        model = settings.get("model") or self.default_model
        system_prompt = build_novel_system_prompt(settings, glossary)

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text},
                    ],
                    "temperature": settings.get("temperature", 0.3),
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["choices"][0]["message"]["content"].strip()
            tokens = data.get("usage", {}).get("total_tokens")
            return TranslateResult(
                translated_text=translated,
                provider_used=f"{self.provider_name} ({model})",
                token_count=tokens,
            )


class GeminiTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError("API Key required for Gemini")
        model = settings.get("model") or "gemini-2.0-flash"
        system_prompt = build_novel_system_prompt(settings, glossary)
        endpoint = validate_endpoint(
            settings.get("custom_endpoint") or f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        )

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                json={
                    "contents": [{"role": "user", "parts": [{"text": system_prompt + "\n\nVăn bản cần dịch:\n" + text}]}],
                    "generationConfig": {"temperature": settings.get("temperature", 0.3)},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            tokens = data.get("usageMetadata", {}).get("totalTokenCount")
            return TranslateResult(translated_text=translated, provider_used=f"Gemini ({model})", token_count=tokens)


class OllamaTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        endpoint = settings.get("custom_endpoint") or "http://localhost:11434/api/generate"
        model = settings.get("model") or "qwen2.5"
        system_prompt = build_novel_system_prompt(settings, glossary)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                endpoint,
                json={"model": model, "system": system_prompt, "prompt": text, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
            return TranslateResult(
                translated_text=data.get("response", text).strip(),
                provider_used=f"Ollama ({model})",
            )


class ClaudeTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError("API Key required for Claude")
        model = settings.get("model") or "claude-3-5-sonnet-20240620"
        system_prompt = build_novel_system_prompt(settings, glossary)
        endpoint = validate_endpoint(
            settings.get("custom_endpoint") or "https://api.anthropic.com/v1/messages",
            "https://api.anthropic.com/v1/messages",
        )

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": model,
                    "max_tokens": 4000,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": text}],
                    "temperature": settings.get("temperature", 0.3),
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["content"][0]["text"].strip()
            tokens = (data.get("usage", {}).get("input_tokens", 0) or 0) + (
                data.get("usage", {}).get("output_tokens", 0) or 0
            )
            return TranslateResult(translated_text=translated, provider_used=f"Claude ({model})", token_count=tokens or None)


class CohereTranslator(TranslatorProvider):
    async def translate(self, text, source_lang, target_lang, settings, glossary):
        api_key = settings.get("api_key", "")
        if not api_key:
            raise ValueError("API Key required for Cohere")
        model = settings.get("model") or "command-r-plus"
        system_prompt = build_novel_system_prompt(settings, glossary)
        endpoint = validate_endpoint(
            settings.get("custom_endpoint") or "https://api.cohere.ai/v1/chat",
            "https://api.cohere.ai/v1/chat",
        )

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "message": text,
                    "preamble": system_prompt,
                    "temperature": settings.get("temperature", 0.3),
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data.get("text", text).strip()
            billed = data.get("meta", {}).get("billed_units", {})
            tokens = (billed.get("input_tokens", 0) or 0) + (billed.get("output_tokens", 0) or 0)
            return TranslateResult(translated_text=translated, provider_used=f"Cohere ({model})", token_count=tokens or None)


PROVIDERS: dict[str, TranslatorProvider] = {
    "free_google": GoogleFreeTranslator(),
    "free_mymemory": MyMemoryTranslator(),
    "gemini": GeminiTranslator(),
    "openai": OpenAICompatibleTranslator(
        default_endpoint="https://api.openai.com/v1/chat/completions",
        default_model="gpt-4o-mini",
        provider_name="OpenAI",
    ),
    "deepseek": OpenAICompatibleTranslator(
        default_endpoint="https://api.deepseek.com/chat/completions",
        default_model="deepseek-chat",
        provider_name="DeepSeek",
    ),
    "ollama": OllamaTranslator(),
    "claude": ClaudeTranslator(),
    "mistral": OpenAICompatibleTranslator(
        default_endpoint="https://api.mistral.ai/v1/chat/completions",
        default_model="mistral-large-latest",
        provider_name="Mistral",
    ),
    "cohere": CohereTranslator(),
    "groq": OpenAICompatibleTranslator(
        default_endpoint="https://api.groq.com/openai/v1/chat/completions",
        default_model="llama3-8b-8192",
        provider_name="Groq",
    ),
}


async def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    settings: dict,
    glossary: list[dict] | None = None,
) -> dict:
    if not text or not text.strip():
        return TranslateResult(translated_text="", provider_used=settings.get("provider", "unknown")).to_dict()

    provider_name = settings.get("provider", "free_google")

    processed = text
    if settings.get("apply_glossary") and glossary:
        processed = apply_pre_glossary(text, glossary)

    provider = PROVIDERS.get(provider_name)
    if not provider:
        provider = PROVIDERS["free_google"]
        provider_name = "free_google"

    try:
        result = await provider.translate(processed, source_lang, target_lang, settings, glossary or [])
        return result.to_dict()
    except Exception:
        if provider_name != "free_google":
            fallback = PROVIDERS["free_google"]
            result = await fallback.translate(processed, source_lang, target_lang, settings, glossary or [])
            return result.to_dict()
        raise

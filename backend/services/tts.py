"""TTS Service — Edge TTS (free, cloud) + future Piper/XTTS-v2 support."""
import tempfile
import os
from pathlib import Path

# Edge TTS is the primary free provider
# Piper (local ONNX) and XTTS-v2 (voice cloning) added later

EDGETTS_VOICES = {
    "vi-VN-HoaiMyNeural": "Vietnamese (Female)",
    "vi-VN-NamMinhNeural": "Vietnamese (Male)",
    "en-US-JennyNeural": "English (Female)",
    "en-US-GuyNeural": "English (Male)",
    "ja-JP-NanamiNeural": "Japanese (Female)",
    "ko-KR-SunHiNeural": "Korean (Female)",
    "zh-CN-XiaoxiaoNeural": "Chinese (Female)",
    "zh-CN-YunxiNeural": "Chinese (Male)",
}


async def generate_tts_edge(text: str, voice: str = "vi-VN-HoaiMyNeural", rate: str = "+0%") -> bytes:
    """Generate TTS audio using Edge TTS (free, no API key)."""
    try:
        import edge_tts
        import asyncio
    except ImportError:
        raise RuntimeError("edge-tts not installed: pip install edge-tts")

    communicate = edge_tts.Communicate(text, voice, rate=rate)

    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]

    return audio_data


async def generate_tts(text: str, provider: str = "edge", voice: str = "vi-VN-HoaiMyNeural", rate: str = "+0%") -> dict:
    """Main TTS entry point.

    Returns: {"audio_bytes": bytes, "content_type": str, "provider": str}
    """
    if provider == "edge":
        audio = await generate_tts_edge(text, voice, rate)
        return {
            "audio_bytes": audio,
            "content_type": "audio/mpeg",
            "provider": "edge-tts",
        }
    else:
        raise ValueError(f"Unknown TTS provider: {provider}")


def list_voices() -> list[dict]:
    """List available voices."""
    return [{"id": k, "name": v} for k, v in EDGETTS_VOICES.items()]

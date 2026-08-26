"""TTS Router — text-to-speech endpoints."""
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from services.tts import generate_tts, list_voices

router = APIRouter(tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = "vi-VN-HoaiMyNeural"
    rate: str = "+0%"
    provider: str = "edge"


class VoiceInfo(BaseModel):
    id: str
    name: str


@router.post("/tts", response_class=Response)
async def tts_generate(body: TTSRequest):
    """Generate TTS audio from text. Returns audio/mpeg bytes."""
    result = await generate_tts(
        text=body.text,
        provider=body.provider,
        voice=body.voice,
        rate=body.rate,
    )
    return Response(
        content=result["audio_bytes"],
        media_type=result["content_type"],
    )


@router.get("/tts/voices", response_model=list[VoiceInfo])
async def tts_voices():
    """List available TTS voices."""
    return list_voices()

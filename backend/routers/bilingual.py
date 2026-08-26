"""Bilingual EPUB Export Router."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

from database import DB_PATH
from services.bilingual_epub import create_bilingual_epub_from_db_async

router = APIRouter(tags=["bilingual"])


@router.get("/projects/{project_id}/export/bilingual-epub")
async def export_bilingual_epub(project_id: str):
    """
    Export project as bilingual EPUB with interleaved original and translated text.
    """
    try:
        epub_bytes = await create_bilingual_epub_from_db_async(str(DB_PATH), project_id)

        filename = f"bilingual_{project_id}.epub"

        return StreamingResponse(
            io.BytesIO(epub_bytes),
            media_type="application/epub+zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EPUB generation failed: {str(e)}")

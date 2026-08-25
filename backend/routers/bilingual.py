"""Bilingual EPUB Export Router."""
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import io

from services.bilingual_epub import create_bilingual_epub_from_db
from database import get_db
from models import ChapterData

router = APIRouter(tags=["bilingual"])


@router.get("/projects/{project_id}/export/bilingual-epub")
async def export_bilingual_epub(project_id: str):
    """
    Export project as bilingual EPUB with interleaved original and translated text.
    """
    try:
        # Use the database path from get_db's context
        # For now, hardcode to the default
        db_path = "omninovel.db"
        epub_bytes = create_bilingual_epub_from_db(db_path, project_id)

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
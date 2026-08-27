"""Chapter Notes & Comments Router."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from security import get_current_user

router = APIRouter(tags=["notes"], dependencies=[Depends(get_current_user)])


class NoteCreate(BaseModel):
    note: str = ""
    updated_at: Optional[int] = None


@router.get("/projects/{project_id}/chapters/{chapter_id}/notes")
async def get_note(project_id: str, chapter_id: str):
    from database import get_db
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM chapter_notes WHERE chapter_id = ?", (chapter_id,)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return {"id": None, "chapter_id": chapter_id, "note": "", "updated_at": 0}
            return dict(row)
    finally:
        await db.close()


@router.post("/projects/{project_id}/chapters/{chapter_id}/notes")
async def upsert_note(project_id: str, chapter_id: str, body: NoteCreate):
    from database import get_db
    import time
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id FROM chapter_notes WHERE chapter_id = ?", (chapter_id,)
        ) as cur:
            existing = await cur.fetchone()

        if existing:
            note_id = existing["id"]
            await db.execute(
                "UPDATE chapter_notes SET note = ?, updated_at = ? WHERE id = ?",
                (body.note, body.updated_at or int(time.time()), note_id),
            )
        else:
            note_id = f"note_{uuid.uuid4().hex[:12]}"
            await db.execute(
                "INSERT INTO chapter_notes (id, chapter_id, note, updated_at) VALUES (?, ?, ?, ?)",
                (note_id, chapter_id, body.note, body.updated_at or int(time.time())),
            )
        await db.commit()
        return {"id": note_id, "chapter_id": chapter_id, "note": body.note, "updated_at": body.updated_at or int(time.time())}
    finally:
        await db.close()

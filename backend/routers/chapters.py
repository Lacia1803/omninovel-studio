import uuid
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateChapter, UpdateChapter, ChapterResponse

router = APIRouter(tags=["chapters"])


@router.post("/projects/{project_id}/chapters", response_model=ChapterResponse)
async def add_chapter(
    project_id: str,
    body: CreateChapter,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    chap_id = f"chap_{uuid.uuid4().hex[:12]}"
    word_count = body.word_count or len(body.original_content)

    await db.execute(
        "INSERT INTO chapters (id, project_id, number, title, original_content, status, word_count) VALUES (?, ?, ?, ?, ?, 'raw', ?)",
        (chap_id, project_id, body.number, body.title, body.original_content, word_count),
    )
    await db.commit()

    return {
        "id": chap_id,
        "project_id": project_id,
        "number": body.number,
        "title": body.title,
        "original_content": body.original_content,
        "converted_content": None,
        "translated_content": None,
        "status": "raw",
        "word_count": word_count,
    }


@router.put("/projects/{project_id}/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(
    project_id: str,
    chapter_id: str,
    body: UpdateChapter,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?",
        (chapter_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Chapter not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [chapter_id]

    await db.execute(f"UPDATE chapters SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
    return dict(await cursor.fetchone())


@router.delete("/projects/{project_id}/chapters/{chapter_id}")
async def delete_chapter(
    project_id: str,
    chapter_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM chapters WHERE id = ? AND project_id = ?",
        (chapter_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Chapter not found")

    await db.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
    await db.commit()
    return {"ok": True}

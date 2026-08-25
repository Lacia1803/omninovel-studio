import uuid
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateGlossaryItem, UpdateGlossaryItem, GlossaryItemResponse

router = APIRouter(tags=["glossary"])


@router.post("/projects/{project_id}/glossary", response_model=GlossaryItemResponse)
async def add_glossary_item(
    project_id: str,
    body: CreateGlossaryItem,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    item_id = f"gl_{uuid.uuid4().hex[:12]}"
    await db.execute(
        "INSERT INTO glossary (id, project_id, source_term, target_term, category, enabled) VALUES (?, ?, ?, ?, ?, ?)",
        (item_id, project_id, body.source_term, body.target_term, body.category, int(body.enabled)),
    )
    await db.commit()

    return {
        "id": item_id,
        "project_id": project_id,
        "source_term": body.source_term,
        "target_term": body.target_term,
        "category": body.category,
        "enabled": body.enabled,
    }


@router.put("/projects/{project_id}/glossary/{item_id}", response_model=GlossaryItemResponse)
async def update_glossary_item(
    project_id: str,
    item_id: str,
    body: UpdateGlossaryItem,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM glossary WHERE id = ? AND project_id = ?",
        (item_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Glossary item not found")

    updates = {}
    for k, v in body.model_dump().items():
        if v is not None:
            updates[k] = int(v) if k == "enabled" else v
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [item_id]
    await db.execute(f"UPDATE glossary SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM glossary WHERE id = ?", (item_id,))
    row = dict(await cursor.fetchone())
    row["enabled"] = bool(row["enabled"])
    return row


@router.delete("/projects/{project_id}/glossary/{item_id}")
async def delete_glossary_item(
    project_id: str,
    item_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM glossary WHERE id = ? AND project_id = ?",
        (item_id, project_id),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Glossary item not found")

    await db.execute("DELETE FROM glossary WHERE id = ?", (item_id,))
    await db.commit()
    return {"ok": True}

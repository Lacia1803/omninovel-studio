import uuid
import time
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import CreateProject, UpdateProject, ProjectSummary, ProjectResponse, FullProject
from security import get_current_user

router = APIRouter(tags=["projects"], dependencies=[Depends(get_current_user)])


@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, title, author, updated_at FROM projects ORDER BY updated_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    body: CreateProject,
    db: aiosqlite.Connection = Depends(get_db),
):
    now = int(time.time() * 1000)
    project_id = f"project_{uuid.uuid4().hex[:12]}"
    await db.execute(
        "INSERT INTO projects (id, title, author, source_language, target_language, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)",
        (project_id, body.title, body.author, body.source_language, body.target_language, now, now),
    )
    await db.commit()
    return {
        "id": project_id,
        "title": body.title,
        "author": body.author,
        "source_language": body.source_language,
        "target_language": body.target_language,
        "settings_json": "{}",
        "created_at": now,
        "updated_at": now,
    }


@router.get("/projects/{project_id}", response_model=FullProject)
async def get_project(
    project_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project = dict(row)

    cursor = await db.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY number",
        (project_id,),
    )
    chapters = [dict(r) for r in await cursor.fetchall()]

    cursor = await db.execute(
        "SELECT * FROM glossary WHERE project_id = ?",
        (project_id,),
    )
    glossary_items = [dict(r) for r in await cursor.fetchall()]

    return {**project, "chapters": chapters, "glossary": glossary_items}


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: UpdateProject,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = int(time.time() * 1000)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [project_id]

    await db.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    return dict(await cursor.fetchone())


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

    await db.execute("DELETE FROM glossary WHERE project_id = ?", (project_id,))
    await db.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
    await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    await db.commit()
    return {"ok": True}

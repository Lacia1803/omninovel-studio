import json
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import TranslateRequest, TranslateResponse, BatchTranslateRequest, ChapterResponse
from services.translator import translate_text

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=TranslateResponse)
async def translate(body: TranslateRequest):
    result = await translate_text(
        text=body.text,
        source_lang=body.source_lang,
        target_lang=body.target_lang,
        settings={
            "provider": body.provider,
            "api_key": body.api_key,
            "custom_endpoint": body.custom_endpoint,
            "model": body.model,
            "style_prompt": body.style_prompt,
            "custom_prompt": body.custom_prompt,
            "temperature": body.temperature,
            "apply_glossary": body.apply_glossary,
        },
        glossary=body.glossary,
    )
    return result


@router.post("/projects/{project_id}/translate-batch", response_model=list[ChapterResponse])
async def translate_batch(
    project_id: str,
    body: BatchTranslateRequest,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    project = await cursor.fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project = dict(project)
    settings = json.loads(project.get("settings_json", "{}"))

    cursor = await db.execute("SELECT * FROM glossary WHERE project_id = ?", (project_id,))
    glossary = [dict(r) for r in await cursor.fetchall()]

    placeholders = ",".join("?" * len(body.chapter_ids))
    cursor = await db.execute(
        f"SELECT * FROM chapters WHERE id IN ({placeholders}) AND project_id = ?",
        body.chapter_ids + [project_id],
    )
    chapters = [dict(r) for r in await cursor.fetchall()]

    for chap in chapters:
        await db.execute("UPDATE chapters SET status = 'translating' WHERE id = ?", (chap["id"],))
        await db.commit()

        try:
            result = await translate_text(
                text=chap["original_content"],
                source_lang=project.get("source_language", "zh-CN"),
                target_lang=project.get("target_language", "vi"),
                settings=settings,
                glossary=glossary,
            )
            await db.execute(
                "UPDATE chapters SET translated_content = ?, status = 'translated' WHERE id = ?",
                (result["translated_text"], chap["id"]),
            )
        except Exception as e:
            await db.execute("UPDATE chapters SET status = 'error' WHERE id = ?", (chap["id"],))

        await db.commit()

    cursor = await db.execute(
        f"SELECT * FROM chapters WHERE id IN ({placeholders}) AND project_id = ? ORDER BY number",
        body.chapter_ids + [project_id],
    )
    return [dict(r) for r in await cursor.fetchall()]
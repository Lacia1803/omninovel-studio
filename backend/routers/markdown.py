"""Markdown Export Router."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter(tags=["markdown"])


@router.get("/projects/{project_id}/export/markdown")
async def export_markdown(project_id: str, content_type: str = "translated"):
    from database import get_db
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ) as cur:
            project = await cur.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

        async with db.execute(
            "SELECT * FROM chapters WHERE project_id = ? ORDER BY number",
            (project_id,),
        ) as cur:
            chapters = await cur.fetchall()

        md = f"# {project['title']}\n\n"
        md += f"**Tác giả:** {project['author']}\n\n---\n\n"

        for chap in chapters:
            md += f"## {chap['title']}\n\n"
            body = (
                chap["translated_content"] if content_type == "translated"
                else chap["converted_content"] if content_type == "converted"
                else chap["original_content"]
            ) or chap["original_content"] or ""

            paragraphs = [p.strip() for p in body.split("\n") if p.strip()]
            md += "\n\n".join(paragraphs) + "\n\n"

        return PlainTextResponse(content=md, media_type="text/markdown;charset=utf-8")
    finally:
        await db.close()

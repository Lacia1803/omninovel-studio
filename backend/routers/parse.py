import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from models import ParsedNovelData
from services.parser import parse_file

router = APIRouter(tags=["parse"])


@router.post("/parse", response_model=ParsedNovelData)
async def parse_upload(
    file: UploadFile = File(...),
    custom_regex: Optional[str] = Form(None),
):
    suffix = os.path.splitext(file.filename or "upload.txt")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = parse_file(tmp_path, custom_regex)
        return result
    finally:
        os.unlink(tmp_path)
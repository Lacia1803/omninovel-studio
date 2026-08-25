from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class CreateProject(BaseModel):
    title: str = "Dự án mới"
    author: str = "Khuyết danh"
    source_language: str = "zh-CN"
    target_language: str = "vi"

class UpdateProject(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    settings_json: Optional[str] = None

class ProjectSummary(BaseModel):
    id: str
    title: str
    author: str
    updated_at: int

class ProjectResponse(BaseModel):
    id: str
    title: str
    author: str
    source_language: str
    target_language: str
    settings_json: str
    created_at: int
    updated_at: int


class CreateChapter(BaseModel):
    number: int
    title: str
    original_content: str
    word_count: Optional[int] = None

class UpdateChapter(BaseModel):
    number: Optional[int] = None
    title: Optional[str] = None
    original_content: Optional[str] = None
    converted_content: Optional[str] = None
    translated_content: Optional[str] = None
    status: Optional[str] = None
    word_count: Optional[int] = None

class ChapterResponse(BaseModel):
    id: str
    project_id: str
    number: int
    title: str
    original_content: str
    converted_content: Optional[str] = None
    translated_content: Optional[str] = None
    status: str
    word_count: Optional[int] = None


class CreateGlossaryItem(BaseModel):
    source_term: str
    target_term: str
    category: str = "general"
    enabled: bool = True

class UpdateGlossaryItem(BaseModel):
    source_term: Optional[str] = None
    target_term: Optional[str] = None
    category: Optional[str] = None
    enabled: Optional[bool] = None

class GlossaryItemResponse(BaseModel):
    id: str
    project_id: str
    source_term: str
    target_term: str
    category: str
    enabled: bool


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "zh-CN"
    target_lang: str = "vi"
    provider: str = "free_google"
    api_key: str = ""
    custom_endpoint: Optional[str] = None
    model: str = "gemini-2.0-flash"
    style_prompt: str = "literary"
    custom_prompt: Optional[str] = None
    temperature: float = 0.3
    apply_glossary: bool = True
    glossary: list[dict] = []

class TranslateResponse(BaseModel):
    translated_text: str
    provider_used: str
    token_count: Optional[int] = None

class BatchTranslateRequest(BaseModel):
    chapter_ids: list[str]
    mode: str = "ai"

class ParsedNovelData(BaseModel):
    title: str
    author: str
    detected_language: str
    chapters: list[dict]

class FullProject(BaseModel):
    id: str
    title: str
    author: str
    source_language: str
    target_language: str
    settings_json: str
    created_at: int
    updated_at: int
    chapters: list[ChapterResponse]
    glossary: list[GlossaryItemResponse]

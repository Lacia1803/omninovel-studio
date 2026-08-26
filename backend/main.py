from contextlib import asynccontextmanager
import sys
import uuid
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import init_db
from routers import projects, chapters, glossary, translate, parse, tts, bilingual, notes, markdown, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="OmniNovel Studio API",
    version="0.2.0",
    lifespan=lifespan,
)

# --- Structured logging (loguru) ---
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")

# --- Rate limiting (slowapi) ---
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all: log structured error and return sanitized JSON."""
    err_id = uuid.uuid4().hex[:12]
    logger.bind(err_id=err_id, path=request.url.path, method=request.method).error(
        "unhandled_exception type={} msg={}", type(exc).__name__, str(exc)
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": err_id},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "{} {} -> {} ({:.1f}ms)",
        request.method, request.url.path, response.status_code, elapsed_ms,
    )
    return response


app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(chapters.router, prefix="/api")
app.include_router(glossary.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.include_router(parse.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(bilingual.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(markdown.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
"""Authentication endpoints: register, login, /me."""
import re
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import get_db
from security import (
    UserPublic,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class RegisterIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    username: str = Field(..., min_length=2, max_length=40)
    password: str = Field(..., min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


def _validate_email(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )
    return email


@router.post("/register", response_model=TokenOut)
async def register(payload: RegisterIn):
    email = _validate_email(payload.email)
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username cannot be empty")

    db = await get_db()
    try:
        async with db.execute("SELECT 1 FROM users WHERE email = ?", (email,)) as cur:
            if await cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")

        user_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO users (id, email, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, username, hash_password(payload.password), int(time.time())),
        )
        await db.commit()
    finally:
        await db.close()

    token = create_access_token(user_id)
    return TokenOut(access_token=token, user=UserPublic(id=user_id, email=email, username=username))


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn):
    email = _validate_email(payload.email)
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, email, username, password_hash FROM users WHERE email = ?",
            (email,),
        ) as cur:
            row = await cur.fetchone()
    finally:
        await db.close()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(row["id"])
    return TokenOut(
        access_token=token,
        user=UserPublic(id=row["id"], email=row["email"], username=row["username"]),
    )


@router.get("/me", response_model=UserPublic)
async def me(current: UserPublic = Depends(get_current_user)):
    return current
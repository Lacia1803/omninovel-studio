"""Authentication & security utilities: JWT, password hashing, FastAPI deps."""
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from loguru import logger
from pydantic import BaseModel

# --- Configuration ---
_env_secret = os.getenv("JWT_SECRET")
if _env_secret:
    JWT_SECRET = _env_secret
else:
    JWT_SECRET = secrets.token_urlsafe(48)
    logger.warning(
        "JWT_SECRET not set — using ephemeral random secret. "
        "Tokens will NOT survive server restarts. "
        "Set JWT_SECRET env var in production."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

bearer_scheme = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    sub: str  # user id
    exp: int


class UserPublic(BaseModel):
    id: str
    email: str
    username: str


# --- Password hashing ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# --- JWT ---
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[TokenPayload]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenPayload(sub=data["sub"], exp=data["exp"])
    except (JWTError, KeyError, ValueError):
        return None


# --- FastAPI dependency ---
async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserPublic:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(creds.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await _load_user(payload.sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def _load_user(user_id: str) -> Optional[UserPublic]:
    from database import get_db

    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, email, username FROM users WHERE id = ?", (user_id,)
        ) as cur:
            row = await cur.fetchone()
            if row is None:
                return None
            return UserPublic(id=row["id"], email=row["email"], username=row["username"])
    finally:
        await db.close()
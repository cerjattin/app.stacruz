from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: str, expires_minutes: Optional[int] = None, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    if expires_minutes is None:
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)

    to_encode: Dict[str, Any] = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expire.timestamp())}
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])

def verify_password(plain_password: str, password_hash: str) -> bool:
    # bcrypt usa max 72 bytes; esto evita errores si alguien pone contraseña enorme.
    if plain_password and len(plain_password.encode("utf-8")) > 72:
        plain_password = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(plain_password, password_hash)

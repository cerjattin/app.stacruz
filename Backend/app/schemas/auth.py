from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.user import UserRole

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=1, max_length=200)

class UserOut(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut

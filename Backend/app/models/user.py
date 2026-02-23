from __future__ import annotations

import enum
from sqlalchemy import String, Boolean, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERARIO = "OPERARIO"

class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", native_enum=True), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

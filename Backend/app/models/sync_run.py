from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    source: Mapped[str] = mapped_column(String(50), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    tipo_docto: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lookback_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    limit_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)

    total_doctos_sqlserver: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    used_rowversion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    used_fallback_without_date_filter: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_rowversion: Mapped[int | None] = mapped_column(Integer, nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
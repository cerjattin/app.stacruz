from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import DateTime, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class TicketEvent(Base):
    __tablename__ = "ticket_events"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    ticket_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    item_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    user_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
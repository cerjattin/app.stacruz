from __future__ import annotations

import enum
import uuid
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base


class TicketStatus(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    EN_PREPARACION = "EN_PREPARACION"
    PARCIAL = "PARCIAL"
    LISTO = "LISTO"
    CANCELADO = "CANCELADO"


class ItemStatus(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    EN_PREPARACION = "EN_PREPARACION"
    ENTREGADO = "ENTREGADO"
    CANCELADO = "CANCELADO"


class AuditEventType(str, enum.Enum):
    ITEM_STATUS = "ITEM_STATUS"
    ITEM_CANCEL = "ITEM_CANCEL"
    ITEM_REPLACE = "ITEM_REPLACE"
    TICKET_STATUS = "TICKET_STATUS"
    PRINT = "PRINT"


class KitchenTicket(Base):
    __tablename__ = "kitchen_tickets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)

    pos_docto_guid: Mapped[str] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    pos_id_cia: Mapped[int] = mapped_column(Integer, nullable=False)
    pos_co: Mapped[str | None] = mapped_column(String(3), nullable=True)
    pos_tipo_docto: Mapped[str] = mapped_column(String(3), nullable=False)
    pos_consec_docto: Mapped[int | None] = mapped_column(Integer, nullable=True)

    mesa_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pos_rowid_mesa: Mapped[int | None] = mapped_column(Integer, nullable=True)

    pos_rowid_mesero: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mesero_nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)

    hora_pedido: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    pos_ts_actualizacion: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[TicketStatus] = mapped_column(
        SAEnum(TicketStatus, name="ticket_status", native_enum=True),
        nullable=False,
        default=TicketStatus.PENDIENTE,
    )

    hora_preparacion: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hora_entrega: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    comanda_number: Mapped[int | None] = mapped_column(Integer, nullable=True)  # bigserial en DB

    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    items: Mapped[list["KitchenTicketItem"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class KitchenTicketItem(Base):
    __tablename__ = "kitchen_ticket_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("kitchen_tickets.id", ondelete="CASCADE"))

    pos_movto_guid: Mapped[str] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    pos_rowid_item_ext: Mapped[int] = mapped_column(Integer, nullable=False)

    product_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    qty: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    unidad: Mapped[str | None] = mapped_column(String(20), nullable=True)

    pos_ts_actualizacion: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[ItemStatus] = mapped_column(
        SAEnum(ItemStatus, name="item_status", native_enum=True),
        nullable=False,
        default=ItemStatus.PENDIENTE,
    )
    prep_started_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    canceled_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    replaced_by: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    ticket: Mapped["KitchenTicket"] = relationship(back_populates="items")


class TicketItemEvent(Base):
    """
    ✅ Cambio 4 aplicado:
    - id con default uuid4 para evitar warning PK sin default
    - payload como JSONB (si tu DB lo tiene jsonb)
    """
    __tablename__ = "ticket_item_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_item_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("kitchen_ticket_items.id", ondelete="CASCADE"))

    event_type: Mapped[AuditEventType] = mapped_column(
        SAEnum(AuditEventType, name="audit_event_type", native_enum=True),
        nullable=False,
    )

    from_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_status: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    event_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
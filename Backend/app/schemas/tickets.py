from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, Literal
from app.models.ticket import TicketStatus, ItemStatus


class TicketCard(BaseModel):
    id: str
    comanda_number: Optional[int] = None
    mesa_ref: Optional[str] = None
    mesero_nombre: Optional[str] = None
    pos_consec_docto: Optional[int] = None
    status: TicketStatus
    hora_pedido: str
    hora_preparacion: Optional[str] = None
    hora_entrega: Optional[str] = None


class TicketItemOut(BaseModel):
    id: str
    product_name: Optional[str] = None
    qty: float
    unidad: Optional[str] = None
    status: ItemStatus


class TicketDetail(TicketCard):
    items: list[TicketItemOut]


class ItemStatusUpdate(BaseModel):
    status: ItemStatus
    user_name: str = Field(min_length=1, max_length=120)


class ItemCancelRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    user_name: str = Field(min_length=1, max_length=120)


class ItemReplaceRequest(BaseModel):
    new_product_name: str = Field(min_length=1, max_length=200)
    reason: str = Field(min_length=1, max_length=500)
    user_name: str = Field(min_length=1, max_length=120)


class OkResponse(BaseModel):
    ok: Literal[True] = True
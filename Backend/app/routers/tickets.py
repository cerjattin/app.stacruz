from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db  # tu get_db real
from app.models.ticket import KitchenTicket, KitchenTicketItem, TicketStatus, ItemStatus
from app.models.ticket_event import TicketEvent

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


# =========================
# Schemas (Responses)
# =========================

class TicketItemOut(BaseModel):
    id: UUID
    qty: float
    product_name: Optional[str] = None
    unidad: Optional[str] = None
    status: ItemStatus

    class Config:
        from_attributes = True


class TicketCardOut(BaseModel):
    id: UUID
    mesa_ref: Optional[str] = None
    mesero_nombre: Optional[str] = None
    pos_consec_docto: Optional[int] = None
    comanda_number: Optional[int] = None
    status: TicketStatus
    hora_pedido: datetime
    hora_preparacion: Optional[datetime] = None
    hora_entrega: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketDetailOut(TicketCardOut):
    items: list[TicketItemOut] = []

    class Config:
        from_attributes = True


class TicketEventOut(BaseModel):
    id: UUID
    ticket_id: UUID
    item_id: Optional[UUID] = None
    event_type: str
    message: str
    meta: Optional[dict[str, Any]] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# Schemas (Requests)
# =========================

class UpdateItemStatusIn(BaseModel):
    status: ItemStatus
    user_name: str = Field(default="Operario")


class CancelItemIn(BaseModel):
    reason: str = Field(min_length=2)
    user_name: str = Field(default="Operario")


class ReplaceItemIn(BaseModel):
    new_product_name: str = Field(min_length=2)
    reason: str = Field(min_length=2)
    user_name: str = Field(default="Operario")


# =========================
# Helpers
# =========================

def _log_event(
    db: Session,
    *,
    ticket_id: UUID,
    item_id: Optional[UUID],
    event_type: str,
    message: str,
    user_name: Optional[str],
    meta: Optional[dict[str, Any]] = None,
):
    ev = TicketEvent(
        ticket_id=ticket_id,
        item_id=item_id,
        event_type=event_type,
        message=message,
        meta=meta,
        user_name=user_name,
    )
    db.add(ev)


def _compute_ticket_status(items: list[KitchenTicketItem]) -> TicketStatus:
    if not items:
        return TicketStatus.PENDIENTE

    st = [i.status for i in items]

    if all(s == ItemStatus.CANCELADO for s in st):
        return TicketStatus.CANCELADO

    if all(s in (ItemStatus.ENTREGADO, ItemStatus.CANCELADO) for s in st):
        return TicketStatus.LISTO

    if any(s == ItemStatus.ENTREGADO for s in st) and any(s in (ItemStatus.PENDIENTE, ItemStatus.EN_PREPARACION) for s in st):
        return TicketStatus.PARCIAL

    if any(s == ItemStatus.EN_PREPARACION for s in st):
        return TicketStatus.EN_PREPARACION

    return TicketStatus.PENDIENTE


def _set_ticket_times(ticket: KitchenTicket, new_status: TicketStatus):
    now = _now()
    if new_status in (TicketStatus.EN_PREPARACION, TicketStatus.PARCIAL) and ticket.hora_preparacion is None:
        ticket.hora_preparacion = now
    if new_status == TicketStatus.LISTO and ticket.hora_entrega is None:
        ticket.hora_entrega = now


# =========================
# Endpoints
# =========================

@router.get("", response_model=list[TicketCardOut])
def list_tickets(
    status: Optional[TicketStatus] = Query(default=None),
    q: Optional[str] = Query(default=None, description="Buscar por mesa, mesero, #pedido, #comanda"),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    qry = db.query(KitchenTicket)

    if status:
        qry = qry.filter(KitchenTicket.status == status)

    if q:
        qq = f"%{q.strip()}%"
        conditions = [
            KitchenTicket.mesa_ref.ilike(qq),
            KitchenTicket.mesero_nombre.ilike(qq),
            KitchenTicket.notas.ilike(qq),
        ]
        if q.strip().isdigit():
            n = int(q.strip())
            conditions.extend([
                KitchenTicket.pos_consec_docto == n,
                KitchenTicket.comanda_number == n,
            ])
        qry = qry.filter(or_(*conditions))

    rows = qry.order_by(KitchenTicket.hora_pedido.desc()).limit(limit).all()
    return rows


@router.get("/{ticket_id}", response_model=TicketDetailOut)
def get_ticket_detail(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = (
        db.query(KitchenTicket)
        .options(selectinload(KitchenTicket.items))
        .filter(KitchenTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket


@router.patch("/{ticket_id}/items/{item_id}/status")
def update_item_status(ticket_id: UUID, item_id: UUID, payload: UpdateItemStatusIn, db: Session = Depends(get_db)):
    ticket = (
        db.query(KitchenTicket)
        .options(selectinload(KitchenTicket.items))
        .filter(KitchenTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    item = next((x for x in ticket.items if x.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    old_item_status = item.status
    if old_item_status == payload.status:
        return {"ok": True}

    now = _now()

    if payload.status == ItemStatus.EN_PREPARACION and item.prep_started_at is None:
        item.prep_started_at = now
    if payload.status == ItemStatus.ENTREGADO and item.delivered_at is None:
        item.delivered_at = now
    if payload.status == ItemStatus.CANCELADO and item.canceled_at is None:
        item.canceled_at = now

    item.status = payload.status

    _log_event(
        db,
        ticket_id=ticket.id,
        item_id=item.id,
        event_type="ITEM_STATUS",
        message=f"Item estado: {old_item_status.value} → {payload.status.value} ({item.product_name})",
        user_name=payload.user_name,
        meta={"from": old_item_status.value, "to": payload.status.value, "item_id": str(item.id)},
    )

    new_ticket_status = _compute_ticket_status(ticket.items)
    if ticket.status != new_ticket_status:
        old_ticket = ticket.status
        ticket.status = new_ticket_status
        _set_ticket_times(ticket, new_ticket_status)

        _log_event(
            db,
            ticket_id=ticket.id,
            item_id=None,
            event_type="TICKET_STATUS",
            message=f"Ticket estado: {old_ticket.value} → {new_ticket_status.value}",
            user_name=payload.user_name,
            meta={"from": old_ticket.value, "to": new_ticket_status.value},
        )

    db.commit()
    return {"ok": True}


@router.post("/{ticket_id}/items/{item_id}/cancel")
def cancel_item(ticket_id: UUID, item_id: UUID, payload: CancelItemIn, db: Session = Depends(get_db)):
    ticket = (
        db.query(KitchenTicket)
        .options(selectinload(KitchenTicket.items))
        .filter(KitchenTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    item = next((x for x in ticket.items if x.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    now = _now()
    item.status = ItemStatus.CANCELADO
    item.canceled_at = item.canceled_at or now
    item.change_reason = payload.reason

    _log_event(
        db,
        ticket_id=ticket.id,
        item_id=item.id,
        event_type="ITEM_CANCEL",
        message=f"Item cancelado ({item.product_name}). Motivo: {payload.reason}",
        user_name=payload.user_name,
        meta={"reason": payload.reason, "item_id": str(item.id)},
    )

    new_ticket_status = _compute_ticket_status(ticket.items)
    if ticket.status != new_ticket_status:
        old_ticket = ticket.status
        ticket.status = new_ticket_status
        _set_ticket_times(ticket, new_ticket_status)

        _log_event(
            db,
            ticket_id=ticket.id,
            item_id=None,
            event_type="TICKET_STATUS",
            message=f"Ticket estado: {old_ticket.value} → {new_ticket_status.value}",
            user_name=payload.user_name,
            meta={"from": old_ticket.value, "to": new_ticket_status.value},
        )

    db.commit()
    return {"ok": True}


@router.post("/{ticket_id}/items/{item_id}/replace")
def replace_item(ticket_id: UUID, item_id: UUID, payload: ReplaceItemIn, db: Session = Depends(get_db)):
    ticket = (
        db.query(KitchenTicket)
        .options(selectinload(KitchenTicket.items))
        .filter(KitchenTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    item = next((x for x in ticket.items if x.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    old_name = item.product_name
    item.replaced_by = payload.new_product_name
    item.change_reason = payload.reason

    _log_event(
        db,
        ticket_id=ticket.id,
        item_id=item.id,
        event_type="ITEM_REPLACE",
        message=f"Item cambiado: {old_name} → {payload.new_product_name}. Motivo: {payload.reason}",
        user_name=payload.user_name,
        meta={"from": old_name, "to": payload.new_product_name, "reason": payload.reason, "item_id": str(item.id)},
    )

    db.commit()
    return {"ok": True}


@router.post("/{ticket_id}/print", response_class=HTMLResponse)
def print_ticket(
    ticket_id: UUID,
    width: int = Query(default=80, ge=58, le=120),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(KitchenTicket)
        .options(selectinload(KitchenTicket.items))
        .filter(KitchenTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    try:
        _log_event(
            db,
            ticket_id=ticket.id,
            item_id=None,
            event_type="PRINT",
            message=f"Impresión comanda ({width}mm)",
            user_name=None,
            meta={"ticket_id": str(ticket.id), "width": width},
        )
        db.commit()
    except Exception:
        db.rollback()

    items_html = ""
    for it in ticket.items:
        name = (it.product_name or "").strip()
        items_html += f"""
          <tr>
            <td style="width:18%; text-align:right; padding:2px 0;"><strong>{float(it.qty):g}</strong></td>
            <td style="width:82%; padding:2px 0 2px 8px;">{name}</td>
          </tr>
        """

    html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Comanda #{ticket.comanda_number}</title>
  <style>
    @page {{
      size: {width}mm auto;
      margin: 4mm;
    }}
    body {{
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #111;
    }}
    h1 {{
      font-size: 16px;
      margin: 0 0 6px 0;
      text-align:center;
    }}
    .muted {{ color:#555; font-size: 11px; }}
    .row {{ display:flex; justify-content:space-between; gap:8px; }}
    hr {{ border:0; border-top:1px dashed #666; margin:8px 0; }}
    table {{ width:100%; border-collapse:collapse; }}
  </style>
</head>
<body>
  <h1>COMANDA #{ticket.comanda_number or ""}</h1>
  <div class="row"><div><strong>Mesa:</strong> {ticket.mesa_ref or ""}</div><div><strong>Pedido:</strong> {ticket.pos_consec_docto or ""}</div></div>
  <div class="row muted"><div><strong>Mesero:</strong> {ticket.mesero_nombre or ""}</div><div>{ticket.hora_pedido.astimezone().strftime("%Y-%m-%d %H:%M")}</div></div>
  <hr/>
  <table>
    {items_html}
  </table>
  <hr/>
  <div class="muted">Estado: <strong>{ticket.status.value}</strong></div>
  <script>
    window.onload = function() {{
      window.print();
      setTimeout(()=>window.close(), 350);
    }}
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html)


@router.get("/{ticket_id}/events", response_model=list[TicketEventOut])
def get_ticket_events(ticket_id: UUID, db: Session = Depends(get_db)):
    rows = (
        db.query(TicketEvent)
        .filter(TicketEvent.ticket_id == str(ticket_id))
        .order_by(TicketEvent.created_at.asc())
        .all()
    )
    return rows
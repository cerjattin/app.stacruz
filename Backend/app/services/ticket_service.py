from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.ticket import (
    KitchenTicket,
    KitchenTicketItem,
    TicketStatus,
    ItemStatus,
    AuditEventType,
)

from app.models.ticket_event import TicketEvent


def _now():
    return datetime.now(timezone.utc)


# ==========================================================
# STATUS LOGIC
# ==========================================================

def compute_ticket_status(items: list[KitchenTicketItem]) -> TicketStatus:
    if not items:
        return TicketStatus.PENDIENTE

    statuses = [i.status for i in items]

    if all(s == ItemStatus.CANCELADO for s in statuses):
        return TicketStatus.CANCELADO

    if all(s in (ItemStatus.ENTREGADO, ItemStatus.CANCELADO) for s in statuses):
        return TicketStatus.LISTO

    if any(s == ItemStatus.ENTREGADO for s in statuses) and any(
        s in (ItemStatus.PENDIENTE, ItemStatus.EN_PREPARACION) for s in statuses
    ):
        return TicketStatus.PARCIAL

    if any(s == ItemStatus.EN_PREPARACION for s in statuses):
        return TicketStatus.EN_PREPARACION

    return TicketStatus.PENDIENTE


# ==========================================================
# AUDIT (usa ticket_events ✅)
# ==========================================================

def log_ticket_event(
    db: Session,
    *,
    ticket_id: str,
    item_id: str | None,
    event_type: str,
    message: str,
    user_name: str | None,
    meta: dict | None = None,
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


# ==========================================================
# ITEM STATUS UPDATE
# ==========================================================

def update_item_status(
    db: Session,
    *,
    ticket_id: str,
    item_id: str,
    new_status: ItemStatus,
    user_id: str | None,
    user_name: str,
) -> KitchenTicketItem:

    ticket = db.query(KitchenTicket).filter(KitchenTicket.id == ticket_id).first()
    if not ticket:
        raise ValueError("Ticket no encontrado")

    item = (
        db.query(KitchenTicketItem)
        .filter(KitchenTicketItem.id == item_id, KitchenTicketItem.ticket_id == ticket_id)
        .first()
    )
    if not item:
        raise ValueError("Item no encontrado")

    old_status = item.status
    if old_status == new_status:
        return item

    now = _now()

    if new_status == ItemStatus.EN_PREPARACION and item.prep_started_at is None:
        item.prep_started_at = now

    if new_status == ItemStatus.ENTREGADO and item.delivered_at is None:
        item.delivered_at = now

    if new_status == ItemStatus.CANCELADO and item.canceled_at is None:
        item.canceled_at = now

    item.status = new_status

    # Auditoría (ticket_events)
    log_ticket_event(
        db,
        ticket_id=str(ticket_id),
        item_id=str(item.id),
        event_type=AuditEventType.ITEM_STATUS.value,
        message=f"Item estado: {old_status.value} → {new_status.value} ({item.product_name})",
        user_name=user_name,
        meta={"from": old_status.value, "to": new_status.value, "item_id": str(item.id)},
    )

    db.flush()

    items = db.query(KitchenTicketItem).filter(KitchenTicketItem.ticket_id == ticket_id).all()
    new_ticket_status = compute_ticket_status(items)

    # Horas del ticket
    if new_ticket_status in (TicketStatus.EN_PREPARACION, TicketStatus.PARCIAL) and ticket.hora_preparacion is None:
        ticket.hora_preparacion = now

    if new_ticket_status == TicketStatus.LISTO and ticket.hora_entrega is None:
        ticket.hora_entrega = now

    if ticket.status != new_ticket_status:
        old = ticket.status
        ticket.status = new_ticket_status

        log_ticket_event(
            db,
            ticket_id=str(ticket_id),
            item_id=None,
            event_type=AuditEventType.TICKET_STATUS.value,
            message=f"Ticket estado: {old.value} → {new_ticket_status.value}",
            user_name=user_name,
            meta={"from": old.value, "to": new_ticket_status.value},
        )

    db.commit()
    db.refresh(item)
    return item


# ==========================================================
# CANCEL ITEM
# ==========================================================

def cancel_item(
    db: Session,
    *,
    ticket_id: str,
    item_id: str,
    reason: str,
    user_id: str | None,
    user_name: str,
):
    ticket = db.query(KitchenTicket).filter(KitchenTicket.id == ticket_id).first()
    if not ticket:
        raise ValueError("Ticket no encontrado")

    item = (
        db.query(KitchenTicketItem)
        .filter(KitchenTicketItem.id == item_id, KitchenTicketItem.ticket_id == ticket_id)
        .first()
    )
    if not item:
        raise ValueError("Item no encontrado")

    old_status = item.status
    now = _now()

    item.status = ItemStatus.CANCELADO
    item.canceled_at = item.canceled_at or now
    item.change_reason = reason

    log_ticket_event(
        db,
        ticket_id=str(ticket_id),
        item_id=str(item.id),
        event_type=AuditEventType.ITEM_CANCEL.value,
        message=f"Item cancelado ({item.product_name}). Motivo: {reason}",
        user_name=user_name,
        meta={"reason": reason, "item_id": str(item.id)},
    )

    db.flush()

    items = db.query(KitchenTicketItem).filter(KitchenTicketItem.ticket_id == ticket_id).all()
    new_ticket_status = compute_ticket_status(items)

    if ticket.status != new_ticket_status:
        old = ticket.status
        ticket.status = new_ticket_status
        if new_ticket_status == TicketStatus.LISTO and ticket.hora_entrega is None:
            ticket.hora_entrega = now

        log_ticket_event(
            db,
            ticket_id=str(ticket_id),
            item_id=None,
            event_type=AuditEventType.TICKET_STATUS.value,
            message=f"Ticket estado: {old.value} → {new_ticket_status.value}",
            user_name=user_name,
            meta={"from": old.value, "to": new_ticket_status.value},
        )

    db.commit()


# ==========================================================
# REPLACE ITEM
# ==========================================================

def replace_item(
    db: Session,
    *,
    ticket_id: str,
    item_id: str,
    new_product_name: str,
    reason: str,
    user_id: str | None,
    user_name: str,
):
    item = (
        db.query(KitchenTicketItem)
        .filter(KitchenTicketItem.id == item_id, KitchenTicketItem.ticket_id == ticket_id)
        .first()
    )
    if not item:
        raise ValueError("Item no encontrado")

    old_name = item.product_name
    item.replaced_by = new_product_name
    item.change_reason = reason

    log_ticket_event(
        db,
        ticket_id=str(ticket_id),
        item_id=str(item.id),
        event_type=AuditEventType.ITEM_REPLACE.value,
        message=f"Item cambiado: {old_name} → {new_product_name}. Motivo: {reason}",
        user_name=user_name,
        meta={"from": old_name, "to": new_product_name, "reason": reason, "item_id": str(item.id)},
    )

    db.commit()


# ==========================================================
# PRINT AUDIT (llámalo desde tu endpoint /print)
# ==========================================================

def log_print(
    db: Session,
    *,
    ticket_id: str,
    user_name: str | None,
    width: int | None = None,
):
    log_ticket_event(
        db,
        ticket_id=str(ticket_id),
        item_id=None,
        event_type=AuditEventType.PRINT.value,
        message=f"Impresión comanda (80mm)" if width else "Impresión comanda",
        user_name=user_name,
        meta={"ticket_id": str(ticket_id), "width": width},
    )
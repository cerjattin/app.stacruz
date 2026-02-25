from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.ticket import (
    KitchenTicket,
    KitchenTicketItem,
    TicketItemEvent,
    TicketStatus,
    ItemStatus,
    AuditEventType,
)


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
# AUDIT
# ==========================================================

def log_item_event(
    db: Session,
    *,
    item_id: str,
    event_type: AuditEventType,
    from_status: str | None,
    to_status: str | None,
    user_id: str | None,
    user_name: str | None,
    payload: dict | None = None,
):
    ev = TicketItemEvent(
        ticket_item_id=item_id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        user_id=user_id,
        user_name=user_name,
        payload=None if payload is None else str(payload),
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

    item = db.query(KitchenTicketItem).filter(
        KitchenTicketItem.id == item_id,
        KitchenTicketItem.ticket_id == ticket_id
    ).first()
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

    log_item_event(
        db,
        item_id=item.id,
        event_type=AuditEventType.ITEM_STATUS,
        from_status=str(old_status.value),
        to_status=str(new_status.value),
        user_id=user_id,
        user_name=user_name,
        payload={"ticket_id": str(ticket_id)},
    )

    db.flush()

    items = db.query(KitchenTicketItem).filter(
        KitchenTicketItem.ticket_id == ticket_id
    ).all()

    new_ticket_status = compute_ticket_status(items)

    if new_ticket_status in (TicketStatus.EN_PREPARACION, TicketStatus.PARCIAL) and ticket.hora_preparacion is None:
        ticket.hora_preparacion = now

    if new_ticket_status == TicketStatus.LISTO and ticket.hora_entrega is None:
        ticket.hora_entrega = now

    ticket.status = new_ticket_status

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

    item = db.query(KitchenTicketItem).filter(
        KitchenTicketItem.id == item_id,
        KitchenTicketItem.ticket_id == ticket_id
    ).first()
    if not item:
        raise ValueError("Item no encontrado")

    old_status = item.status
    now = _now()

    item.status = ItemStatus.CANCELADO
    item.canceled_at = item.canceled_at or now
    item.change_reason = reason

    log_item_event(
        db,
        item_id=item.id,
        event_type=AuditEventType.ITEM_CANCEL,
        from_status=str(old_status.value),
        to_status=ItemStatus.CANCELADO.value,
        user_id=user_id,
        user_name=user_name,
        payload={"reason": reason},
    )

    db.flush()

    items = db.query(KitchenTicketItem).filter(
        KitchenTicketItem.ticket_id == ticket_id
    ).all()

    ticket.status = compute_ticket_status(items)

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

    item = db.query(KitchenTicketItem).filter(
        KitchenTicketItem.id == item_id,
        KitchenTicketItem.ticket_id == ticket_id
    ).first()
    if not item:
        raise ValueError("Item no encontrado")

    old_name = item.product_name
    item.replaced_by = new_product_name
    item.change_reason = reason

    log_item_event(
        db,
        item_id=item.id,
        event_type=AuditEventType.ITEM_REPLACE,
        from_status=None,
        to_status=None,
        user_id=user_id,
        user_name=user_name,
        payload={"from": old_name, "to": new_product_name, "reason": reason},
    )

    db.commit()
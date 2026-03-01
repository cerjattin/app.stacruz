from sqlalchemy.orm import Session
from app.models.ticket_event import TicketEvent

def log_event(
    db: Session,
    *,
    ticket_id,
    item_id=None,
    event_type: str,
    message: str,
    user_name: str | None = None,
    meta: dict | None = None,
):
    ev = TicketEvent(
        ticket_id=ticket_id,
        item_id=item_id,
        event_type=event_type,
        message=message,
        user_name=user_name,
        meta=meta,
    )
    db.add(ev)
    return ev
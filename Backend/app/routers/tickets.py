from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import require_role
from app.models.user import UserRole, AppUser
from app.models.ticket import KitchenTicket, KitchenTicketItem, AuditEventType
from app.schemas.tickets import (
    TicketCard,
    TicketDetail,
    TicketItemOut,
    ItemStatusUpdate,
    ItemCancelRequest,
    ItemReplaceRequest,
    OkResponse,
)
from app.services.ticket_service import update_item_status, cancel_item, replace_item, log_item_event

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketCard])
def list_tickets(
    status: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    query = db.query(KitchenTicket)

    if status:
        query = query.filter(KitchenTicket.status == status)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (KitchenTicket.mesa_ref.ilike(like))
            | (KitchenTicket.mesero_nombre.ilike(like))
        )

    tickets = query.order_by(KitchenTicket.hora_pedido.desc()).limit(200).all()

    return [
        TicketCard(
            id=str(t.id),
            comanda_number=t.comanda_number,
            mesa_ref=t.mesa_ref,
            mesero_nombre=t.mesero_nombre,
            pos_consec_docto=t.pos_consec_docto,
            status=t.status,
            hora_pedido=t.hora_pedido.isoformat(),
            hora_preparacion=t.hora_preparacion.isoformat() if t.hora_preparacion else None,
            hora_entrega=t.hora_entrega.isoformat() if t.hora_entrega else None,
        )
        for t in tickets
    ]


@router.get("/{ticket_id}", response_model=TicketDetail)
def get_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    ticket = db.query(KitchenTicket).filter(KitchenTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    items = db.query(KitchenTicketItem).filter(KitchenTicketItem.ticket_id == ticket_id).all()

    return TicketDetail(
        id=str(ticket.id),
        comanda_number=ticket.comanda_number,
        mesa_ref=ticket.mesa_ref,
        mesero_nombre=ticket.mesero_nombre,
        pos_consec_docto=ticket.pos_consec_docto,
        status=ticket.status,
        hora_pedido=ticket.hora_pedido.isoformat(),
        hora_preparacion=ticket.hora_preparacion.isoformat() if ticket.hora_preparacion else None,
        hora_entrega=ticket.hora_entrega.isoformat() if ticket.hora_entrega else None,
        items=[
            TicketItemOut(
                id=str(i.id),
                product_name=i.product_name,
                qty=float(i.qty),
                unidad=i.unidad,
                status=i.status,
            )
            for i in items
        ],
    )


@router.patch("/{ticket_id}/items/{item_id}/status", response_model=TicketItemOut)
def patch_item_status(
    ticket_id: str,
    item_id: str,
    payload: ItemStatusUpdate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    try:
        item = update_item_status(
            db,
            ticket_id=ticket_id,
            item_id=item_id,
            new_status=payload.status,
            user_id=str(user.id),
            user_name=payload.user_name,
        )
        return TicketItemOut(
            id=str(item.id),
            product_name=item.product_name,
            qty=float(item.qty),
            unidad=item.unidad,
            status=item.status,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/items/{item_id}/cancel", response_model=OkResponse)
def post_cancel_item(
    ticket_id: str,
    item_id: str,
    payload: ItemCancelRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    try:
        cancel_item(
            db,
            ticket_id=ticket_id,
            item_id=item_id,
            reason=payload.reason,
            user_id=str(user.id),
            user_name=payload.user_name,
        )
        return OkResponse()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/items/{item_id}/replace", response_model=OkResponse)
def post_replace_item(
    ticket_id: str,
    item_id: str,
    payload: ItemReplaceRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    try:
        replace_item(
            db,
            ticket_id=ticket_id,
            item_id=item_id,
            new_product_name=payload.new_product_name,
            reason=payload.reason,
            user_id=str(user.id),
            user_name=payload.user_name,
        )
        return OkResponse()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/print")
def print_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN, UserRole.OPERARIO)),
):
    ticket = db.query(KitchenTicket).filter(KitchenTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    items = db.query(KitchenTicketItem).filter(KitchenTicketItem.ticket_id == ticket_id).all()

    # auditoría de impresión (evento por ticket; usamos tabla item_events como log simple)
    # Si prefieres audit_log, lo movemos allí en el siguiente paso.
    if items:
        log_item_event(
            db,
            item_id=items[0].id,
            event_type=AuditEventType.PRINT,
            from_status=None,
            to_status=None,
            user_id=str(user.id),
            user_name=user.username,
            payload={"ticket_id": ticket_id},
        )
        db.commit()

    html = _render_80mm(ticket, items)
    return Response(content=html, media_type="text/html")


def _render_80mm(ticket: KitchenTicket, items: list[KitchenTicketItem]) -> str:
    # HTML simple, ancho 80mm
    def fmt_dt(dt):
        return dt.strftime("%Y-%m-%d %H:%M") if dt else "-"

    rows = ""
    for i in items:
        qty = float(i.qty)
        name = (i.product_name or "Producto").strip()
        st = i.status.value
        rows += f"""
        <div class="row">
          <div class="qty">{qty:g}x</div>
          <div class="name">{name}</div>
        </div>
        <div class="meta">Estado: {st}</div>
        """

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Comanda {ticket.comanda_number or ""}</title>
  <style>
    @page {{
      size: 80mm auto;
      margin: 4mm;
    }}
    body {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      margin: 0;
      color: #000;
    }}
    .center {{ text-align: center; }}
    .sep {{ border-top: 1px dashed #000; margin: 6px 0; }}
    .title {{ font-weight: 700; font-size: 14px; }}
    .kv {{ display: flex; justify-content: space-between; gap: 8px; }}
    .kv .k {{ color: #222; }}
    .kv .v {{ font-weight: 700; }}
    .row {{ display: flex; gap: 6px; margin-top: 6px; }}
    .qty {{ min-width: 34px; font-weight: 700; }}
    .name {{ flex: 1; }}
    .meta {{ font-size: 11px; margin-left: 40px; }}
    .footer {{ margin-top: 10px; }}
  </style>
</head>
<body>
  <div class="center title">COMANDA</div>
  <div class="center">#{ticket.comanda_number or "-"}</div>

  <div class="sep"></div>

  <div class="kv"><div class="k">Mesa</div><div class="v">{ticket.mesa_ref or "-"}</div></div>
  <div class="kv"><div class="k">Mesero</div><div class="v">{ticket.mesero_nombre or "-"}</div></div>
  <div class="kv"><div class="k">Pedido</div><div class="v">{ticket.pos_consec_docto or "-"}</div></div>
  <div class="kv"><div class="k">Hora pedido</div><div class="v">{fmt_dt(ticket.hora_pedido)}</div></div>
  <div class="kv"><div class="k">Estado</div><div class="v">{ticket.status.value}</div></div>

  <div class="sep"></div>

  <div class="title">Items</div>
  {rows}

  <div class="sep"></div>

  <div class="footer center">Gracias</div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import require_role
from app.models.user import UserRole, AppUser
from app.models.ticket import KitchenTicket, KitchenTicketItem, TicketStatus, ItemStatus

router = APIRouter(prefix="/dev", tags=["dev"])

def _now():
    return datetime.now(timezone.utc)

@router.post("/seed-demo")
def seed_demo(
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role(UserRole.ADMIN)),
):
    # Evita sembrar si ya hay datos
    existing = db.query(KitchenTicket).count()
    if existing > 0:
        raise HTTPException(status_code=400, detail="Ya existen tickets. No se sembró demo.")

    for idx in range(1, 6):
        t = KitchenTicket(
            id=uuid4(),
            pos_docto_guid=uuid4(),
            pos_id_cia=1,
            pos_co="001",
            pos_tipo_docto="01f",
            pos_consec_docto=10000 + idx,
            mesa_ref=str(idx),
            pos_rowid_mesa=idx,
            pos_rowid_mesero=10 + idx,
            mesero_nombre=f"Mesero {idx}",
            hora_pedido=_now(),
            comanda_number=20000 + idx,
            status=TicketStatus.PENDIENTE,
            notas="Demo",
        )
        db.add(t)
        db.flush()

        items = [
            ("Hamburguesa", 1, "UND"),
            ("Papas", 1, "UND"),
            ("Gaseosa", 2, "UND"),
        ]
        for name, qty, um in items:
            it = KitchenTicketItem(
                id=uuid4(),
                ticket_id=t.id,
                pos_movto_guid=uuid4(),
                pos_rowid_item_ext=1000 + idx,
                product_name=name,
                qty=qty,
                unidad=um,
                status=ItemStatus.PENDIENTE,
            )
            db.add(it)

    db.commit()
    return {"ok": True, "seeded": 5}
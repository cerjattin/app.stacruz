from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.integrations.siesa.client import fetch_all, get_siesa_settings_from_env, siesa_connection
from app.integrations.siesa import queries
from app.models.ticket import KitchenTicket, KitchenTicketItem, TicketStatus, ItemStatus


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coalesce_ts(ts_a: Optional[datetime], ts_b: Optional[datetime]) -> Optional[datetime]:
    return ts_a or ts_b


def _mk_placeholders(n: int) -> str:
    return ",".join(["?"] * n)


@dataclass
class SyncResult:
    new_tickets: int
    updated_tickets: int
    last_ts: Optional[datetime]


def get_last_sync_ts(db: Session) -> Optional[datetime]:
    # ✅ Simple: usa una tabla sync_state si la creas.
    # Para no bloquearte hoy, lo dejo como "últimas 24h" si no existe tabla.
    # Si YA tienes sync_state, lo ajusto y te lo dejo fino.
    row = db.execute("SELECT to_char(now() - interval '1 day','YYYY-MM-DD\"T\"HH24:MI:SS')").scalar()
    # devolvemos una fecha UTC aproximada:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def set_last_sync_ts(db: Session, ts: datetime) -> None:
    # Si creas sync_state, aquí haces UPSERT.
    # Por ahora NO hacemos nada para no romper.
    return


def run_siesa_sync(db: Session, *, tipo_docto: str = "01f") -> SyncResult:
    settings = get_siesa_settings_from_env()
    if settings is None:
        raise RuntimeError("SIESA SQL Server no está configurado en .env (host/db/user).")

    since = get_last_sync_ts(db) or (datetime.now(timezone.utc) - timedelta(hours=24))

    with siesa_connection(settings) as conn:
        doctos = fetch_all(conn, queries.SQL_GET_DOCTOS_CHANGED, (tipo_docto, since, since))

        if not doctos:
            return SyncResult(new_tickets=0, updated_tickets=0, last_ts=since)

        docto_guids = [d["docto_guid"] for d in doctos if d.get("docto_guid")]

        # --- Items
        items_sql = queries.SQL_GET_ITEMS_BY_DOCTO_GUIDS.format(placeholders=_mk_placeholders(len(docto_guids)))
        items_rows = fetch_all(conn, items_sql, tuple(docto_guids))

        # index items by docto_guid
        items_by_docto: Dict[str, List[Dict[str, Any]]] = {}
        item_ext_ids: List[int] = []
        for r in items_rows:
            g = str(r["docto_guid"])
            items_by_docto.setdefault(g, []).append(r)
            if r.get("rowid_item_ext") is not None:
                item_ext_ids.append(int(r["rowid_item_ext"]))

        # --- Item names
        item_name_by_ext: Dict[int, str] = {}
        if item_ext_ids:
            uniq_ext = sorted(set(item_ext_ids))
            names_sql = queries.SQL_GET_ITEM_NAMES.format(placeholders=_mk_placeholders(len(uniq_ext)))
            names_rows = fetch_all(conn, names_sql, tuple(uniq_ext))
            for r in names_rows:
                item_name_by_ext[int(r["rowid_item_ext"])] = (r.get("item_nombre") or "").strip()

        # --- Meseros (terceros)
        tercero_ids = [int(d["rowid_mesero"]) for d in doctos if d.get("rowid_mesero") is not None]
        tercero_name: Dict[int, str] = {}
        if tercero_ids:
            uniq_t = sorted(set(tercero_ids))
            t_sql = queries.SQL_GET_TERCEROS.format(placeholders=_mk_placeholders(len(uniq_t)))
            t_rows = fetch_all(conn, t_sql, tuple(uniq_t))
            for r in t_rows:
                tercero_name[int(r["rowid_tercero"])] = (r.get("nombre_est") or "").strip()

        # --- Mesas (control)
        guids_control = [d.get("guid_control_tpv") for d in doctos if d.get("guid_control_tpv")]
        mesa_ref_by_guid: Dict[str, str] = {}
        if guids_control:
            uniq_g = sorted(set([str(x) for x in guids_control]))
            m_sql = queries.SQL_GET_MESAS.format(placeholders=_mk_placeholders(len(uniq_g)))
            m_rows = fetch_all(conn, m_sql, tuple(uniq_g))
            for r in m_rows:
                mesa_ref_by_guid[str(r["guid_control_tpv"])] = str(r.get("referencia_mesa") or r.get("rowid_mesa") or "").strip()

    # --- Upsert en Postgres
    new_count = 0
    upd_count = 0
    max_ts: Optional[datetime] = None

    for d in doctos:
        docto_guid = d["docto_guid"]
        docto_guid_str = str(docto_guid)

        ts = _coalesce_ts(d.get("ts_actualizacion"), d.get("ts_creacion"))
        if ts and (max_ts is None or ts > max_ts):
            max_ts = ts

        # Buscamos ticket existente por pos_docto_guid
        ticket: Optional[KitchenTicket] = (
            db.query(KitchenTicket)
            .filter(KitchenTicket.pos_docto_guid == docto_guid)
            .first()
        )

        mesa_ref = mesa_ref_by_guid.get(str(d.get("guid_control_tpv") or ""), None)
        rowid_mesero = d.get("rowid_mesero")
        mesero_nombre = tercero_name.get(int(rowid_mesero), None) if rowid_mesero is not None else None

        if ticket is None:
            ticket = KitchenTicket(
                pos_docto_guid=docto_guid,
                pos_id_cia=int(d["id_cia"]) if d.get("id_cia") is not None else None,
                pos_co=str(d.get("id_co") or "").strip() or None,
                pos_tipo_docto=str(d.get("tipo_docto") or "").strip() or None,
                pos_consec_docto=int(d["consec_docto"]) if d.get("consec_docto") is not None else None,
                mesa_ref=mesa_ref,
                pos_rowid_mesero=int(rowid_mesero) if rowid_mesero is not None else None,
                mesero_nombre=mesero_nombre,
                hora_pedido=_coalesce_ts(d.get("ts_creacion"), _utcnow()) or _utcnow(),
                pos_ts_actualizacion=d.get("ts_actualizacion"),
                status=TicketStatus.PENDIENTE,
            )
            # Si tu modelo exige comanda_number NOT NULL:
            # - Lo ideal: que tenga default en DB (sequence) o en app.
            # - Si no lo tienes, aquí debes asignarlo (ver nota abajo).
            db.add(ticket)
            db.flush()  # para tener ticket.id
            new_count += 1
        else:
            changed = False
            # actualiza mesa/mesero si vinieron
            if mesa_ref and ticket.mesa_ref != mesa_ref:
                ticket.mesa_ref = mesa_ref
                changed = True
            if mesero_nombre and ticket.mesero_nombre != mesero_nombre:
                ticket.mesero_nombre = mesero_nombre
                changed = True
            if d.get("ts_actualizacion") and ticket.pos_ts_actualizacion != d.get("ts_actualizacion"):
                ticket.pos_ts_actualizacion = d.get("ts_actualizacion")
                changed = True
            if changed:
                upd_count += 1

        # --- upsert items
        rows_items = items_by_docto.get(docto_guid_str, [])
        if rows_items:
            # index existentes por rowid_item_ext (o por product_name fallback)
            existing_by_ext: Dict[int, KitchenTicketItem] = {}
            for it in ticket.items:
                if it.pos_rowid_item_ext is not None:
                    existing_by_ext[int(it.pos_rowid_item_ext)] = it

            for r in rows_items:
                ext = r.get("rowid_item_ext")
                if ext is None:
                    continue
                ext_i = int(ext)
                name = item_name_by_ext.get(ext_i, "") or None

                qty = r.get("qty_1") or r.get("qty_base") or 1
                try:
                    qty = float(qty)
                except Exception:
                    qty = 1.0

                if ext_i in existing_by_ext:
                    it = existing_by_ext[ext_i]
                    # solo actualizar nombre/cantidad si cambia
                    if name and it.product_name != name:
                        it.product_name = name
                    if it.qty != qty:
                        it.qty = qty
                else:
                    it = KitchenTicketItem(
                        ticket_id=ticket.id,
                        qty=qty,
                        product_name=name,
                        status=ItemStatus.PENDIENTE,
                        pos_rowid_item_ext=ext_i,
                    )
                    db.add(it)

    if max_ts:
        set_last_sync_ts(db, max_ts)

    db.commit()
    return SyncResult(new_tickets=new_count, updated_tickets=upd_count, last_ts=max_ts)
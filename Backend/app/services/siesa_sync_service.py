from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

from app.integrations.siesa_sqlserver import connect_siesa, load_siesa_config_from_env, query
from app.models.ticket import KitchenTicket, KitchenTicketItem, TicketStatus, ItemStatus


@dataclass
class SyncResult:
    new_tickets: int = 0
    updated_tickets: int = 0
    new_items: int = 0
    updated_items: int = 0
    skipped_items: int = 0


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _safe_uuid(v) -> UUID:
    if isinstance(v, UUID):
        return v
    return UUID(str(v))


def _next_comanda_number(db: Session) -> int:
    last = db.query(KitchenTicket.comanda_number).order_by(KitchenTicket.comanda_number.desc()).first()
    return int(last[0] or 0) + 1 if last else 1


def _get_sync_state(db: Session) -> tuple[Optional[datetime], Optional[int]]:
    row = db.execute(
        text("select last_sync_at, last_rowversion from sync_state where source = 'SIESA'")
    ).fetchone()
    if not row:
        return None, None
    return _as_utc(row[0]), row[1]


def _set_sync_state(db: Session, dt: Optional[datetime], rv: Optional[int]) -> None:
    db.execute(
        text(
            """
            update sync_state
               set last_sync_at = :last_sync_at,
                   last_rowversion = :last_rowversion,
                   updated_at = now()
             where source = 'SIESA'
            """
        ),
        {"last_sync_at": _as_utc(dt), "last_rowversion": rv},
    )


def _sqlserver_column_exists(conn, table_name: str, column_name: str) -> bool:
    rows = query(
        conn,
        """
        SELECT COUNT(*) AS n
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ? AND COLUMN_NAME = ?
        """,
        [table_name, column_name],
    )
    return bool(rows and rows[0].get("n", 0) > 0)


def _find_table_by_columns(conn, required_columns: list[str]) -> Optional[str]:
    if not required_columns:
        return None

    placeholders = ",".join(["?"] * len(required_columns))
    rows = query(
        conn,
        f"""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE COLUMN_NAME IN ({placeholders})
        GROUP BY TABLE_NAME
        HAVING COUNT(DISTINCT COLUMN_NAME) = ?
        ORDER BY TABLE_NAME
        """,
        [*required_columns, len(required_columns)],
    )
    if not rows:
        return None
    return rows[0]["TABLE_NAME"]


def _resolve_mesero_name(conn, rowid_tercero: Optional[int]) -> Optional[str]:
    if not rowid_tercero:
        return None

    rows = query(
        conn,
        """
        SELECT TOP 1
          f200_nombre_est AS nombre_est
        FROM dbo.t200_mm_terceros
        WHERE f200_rowid = ?
        """,
        [rowid_tercero],
    )
    if not rows:
        return None

    return rows[0].get("nombre_est")


def _resolve_product_name(conn, rowid_item_ext: Optional[int]) -> tuple[Optional[str], Optional[str]]:
    if not rowid_item_ext:
        return None, None

    rows = query(
        conn,
        """
        SELECT TOP 1
          t120.f120_descripcion AS product_name
        FROM dbo.t121_mc_items_extensiones t121
        INNER JOIN dbo.t120_mc_items t120
          ON t120.f120_rowid = t121.f121_rowid_item
        WHERE t121.f121_rowid = ?
        """,
        [rowid_item_ext],
    )
    if not rows:
        return None, None

    return rows[0].get("product_name"), None


def _resolve_mesa_from_docto(conn, docto_guid) -> tuple[Optional[int], Optional[str], Optional[str], Optional[str]]:
    """
    Relación confirmada por el usuario:
      f9823_guid_docto        -> f9820_guid
      f9823_guid_control_mesa -> f9851_guid
    """
    if not docto_guid:
        return None, None, None, None

    table_9823 = _find_table_by_columns(
        conn,
        ["f9823_guid_docto", "f9823_guid_control_mesa"],
    )
    if not table_9823:
        return None, None, None, None

    rows = query(
        conn,
        f"""
        SELECT TOP 1
          s.f9823_guid_docto,
          s.f9823_guid_control_mesa,
          m.f9851_guid,
          m.f9851_rowid_mesa,
          m.f9851_referencia_mesa
        FROM dbo.{table_9823} s
        INNER JOIN dbo.t9851_pdv_control_mesas m
          ON m.f9851_guid = s.f9823_guid_control_mesa
        WHERE s.f9823_guid_docto = ?
        """,
        [str(docto_guid)],
    )
    if not rows:
        return None, None, None, table_9823

    r = rows[0]

    rowid_mesa = r.get("f9851_rowid_mesa")
    try:
        rowid_mesa = int(rowid_mesa) if rowid_mesa is not None else None
    except Exception:
        rowid_mesa = None

    referencia = r.get("f9851_referencia_mesa")
    referencia = str(referencia).strip() if referencia is not None else None

    mesa_ref = referencia if referencia else (str(rowid_mesa) if rowid_mesa is not None else None)
    guid_control_mesa = r.get("f9823_guid_control_mesa")
    guid_control_mesa = str(guid_control_mesa) if guid_control_mesa is not None else None

    return rowid_mesa, mesa_ref, guid_control_mesa, table_9823


def _fetch_doctos(conn, tipo_docto: str, since: datetime, last_rowversion: Optional[int], limit: int):
    has_rowversion = _sqlserver_column_exists(conn, "t9820_pdv_d_doctos", "f9820_rowversion")

    if has_rowversion:
        rv = last_rowversion or 0
        doctos = query(
            conn,
            f"""
            SELECT TOP ({limit})
              f9820_guid,
              f9820_id_cia,
              f9820_id_co,
              f9820_id_tipo_docto,
              f9820_consec_docto,
              f9820_fecha_ts_creacion,
              f9820_fecha_ts_actualizacion,
              f9820_rowid_tercero_vendedor,
              CAST(f9820_rowversion AS bigint) AS rowversion_num
            FROM dbo.t9820_pdv_d_doctos
            WHERE UPPER(LTRIM(RTRIM(f9820_id_tipo_docto))) = UPPER(LTRIM(RTRIM(?)))
              AND CAST(f9820_rowversion AS bigint) > ?
            ORDER BY CAST(f9820_rowversion AS bigint) ASC
            """,
            [tipo_docto, rv],
        )
        if doctos:
            return doctos, True, False

    doctos = query(
        conn,
        f"""
        SELECT TOP ({limit})
          f9820_guid,
          f9820_id_cia,
          f9820_id_co,
          f9820_id_tipo_docto,
          f9820_consec_docto,
          f9820_fecha_ts_creacion,
          f9820_fecha_ts_actualizacion,
          f9820_rowid_tercero_vendedor,
          NULL AS rowversion_num
        FROM dbo.t9820_pdv_d_doctos
        WHERE UPPER(LTRIM(RTRIM(f9820_id_tipo_docto))) = UPPER(LTRIM(RTRIM(?)))
          AND (
            f9820_fecha_ts_actualizacion >= ?
            OR f9820_fecha_ts_creacion >= ?
          )
        ORDER BY COALESCE(f9820_fecha_ts_actualizacion, f9820_fecha_ts_creacion) DESC
        """,
        [tipo_docto, since, since],
    )
    if doctos:
        return doctos, False, False

    doctos = query(
        conn,
        f"""
        SELECT TOP ({limit})
          f9820_guid,
          f9820_id_cia,
          f9820_id_co,
          f9820_id_tipo_docto,
          f9820_consec_docto,
          f9820_fecha_ts_creacion,
          f9820_fecha_ts_actualizacion,
          f9820_rowid_tercero_vendedor,
          NULL AS rowversion_num
        FROM dbo.t9820_pdv_d_doctos
        WHERE UPPER(LTRIM(RTRIM(f9820_id_tipo_docto))) = UPPER(LTRIM(RTRIM(?)))
        ORDER BY COALESCE(f9820_fecha_ts_actualizacion, f9820_fecha_ts_creacion) DESC
        """,
        [tipo_docto],
    )
    return doctos, False, True


def debug_connection_info() -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    db_info = query(
        conn,
        """
        SELECT
            DB_NAME() AS current_db,
            @@SERVERNAME AS server_name,
            GETDATE() AS server_time
        """
    )

    counts = query(
        conn,
        """
        SELECT
          (SELECT COUNT(*) FROM dbo.t9820_pdv_d_doctos) AS total_t9820,
          (SELECT COUNT(*) FROM dbo.t9830_pdv_d_movto_venta) AS total_t9830,
          (SELECT COUNT(*) FROM dbo.t9851_pdv_control_mesas) AS total_t9851
        """
    )

    table_9823 = _find_table_by_columns(
        conn,
        ["f9823_guid_docto", "f9823_guid_control_mesa"],
    )

    return {
        "ok": True,
        "db_info": db_info,
        "counts": counts,
        "detected_table_9823": table_9823,
    }


def debug_tipo_docto_values(*, limit: int = 50) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    rows = query(
        conn,
        f"""
        SELECT TOP ({limit})
          UPPER(LTRIM(RTRIM(f9820_id_tipo_docto))) AS tipo_docto,
          COUNT(*) AS total
        FROM dbo.t9820_pdv_d_doctos
        GROUP BY UPPER(LTRIM(RTRIM(f9820_id_tipo_docto)))
        ORDER BY total DESC
        """
    )

    return {"ok": True, "count": len(rows), "rows": rows}


def debug_latest_doctos(*, tipo_docto: str = "01f", limit: int = 20) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    doctos = query(
        conn,
        f"""
        SELECT TOP ({limit})
          f9820_guid,
          f9820_id_cia,
          f9820_id_co,
          f9820_id_tipo_docto,
          f9820_consec_docto,
          f9820_fecha_ts_creacion,
          f9820_fecha_ts_actualizacion,
          f9820_rowid_tercero_vendedor
        FROM dbo.t9820_pdv_d_doctos
        WHERE UPPER(LTRIM(RTRIM(f9820_id_tipo_docto))) = UPPER(LTRIM(RTRIM(?)))
        ORDER BY COALESCE(f9820_fecha_ts_actualizacion, f9820_fecha_ts_creacion) DESC
        """,
        [tipo_docto],
    )

    return {"ok": True, "tipo_docto": tipo_docto, "count": len(doctos), "rows": doctos}


def debug_docto_lines(docto_guid: str) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    lines = query(
        conn,
        """
        SELECT
          f9830_guid_docto,
          f9830_guid,
          f9830_rowid_item_ext,
          f9830_cant_1,
          f9830_cant_base,
          f9830_id_unidad_medida,
          f9830_fecha_ts_actualizacion
        FROM dbo.t9830_pdv_d_movto_venta
        WHERE f9830_guid_docto = ?
        """,
        [docto_guid],
    )

    enriched = []
    for ln in lines:
        rowid_item_ext = ln.get("f9830_rowid_item_ext")
        try:
            rowid_item_ext = int(rowid_item_ext) if rowid_item_ext is not None else None
        except Exception:
            rowid_item_ext = None

        product_name, unidad_from_item = _resolve_product_name(conn, rowid_item_ext)
        enriched.append(
            {
                **ln,
                "product_name": product_name,
                "unidad_resuelta": unidad_from_item,
            }
        )

    return {"ok": True, "docto_guid": docto_guid, "count": len(enriched), "rows": enriched}


def debug_t9830_sample(limit: int = 20) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    columns = query(
        conn,
        """
        SELECT
          COLUMN_NAME,
          DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 't9830_pdv_d_movto_venta'
        ORDER BY ORDINAL_POSITION
        """
    )

    rows = query(
        conn,
        f"""
        SELECT TOP ({limit})
          f9830_guid,
          f9830_guid_docto,
          f9830_rowid_item_ext,
          f9830_cant_1,
          f9830_cant_base,
          f9830_id_unidad_medida,
          f9830_fecha_ts_creacion,
          f9830_fecha_ts_actualizacion
        FROM dbo.t9830_pdv_d_movto_venta
        ORDER BY COALESCE(f9830_fecha_ts_actualizacion, f9830_fecha_ts_creacion) DESC
        """
    )

    return {
        "ok": True,
        "columns_count": len(columns),
        "columns": columns,
        "rows_count": len(rows),
        "rows": rows,
    }


def debug_t9830_by_possible_keys(docto_guid: str, limit: int = 20) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    results = {}
    tests = [
        ("f9830_guid_docto", f"SELECT TOP ({limit}) * FROM dbo.t9830_pdv_d_movto_venta WHERE f9830_guid_docto = ?"),
        ("f9830_guid", f"SELECT TOP ({limit}) * FROM dbo.t9830_pdv_d_movto_venta WHERE f9830_guid = ?"),
    ]

    for name, sql in tests:
        try:
            rows = query(conn, sql, [docto_guid])
            results[name] = {"count": len(rows), "rows": rows}
        except Exception as e:
            results[name] = {"error": repr(e)}

    return {"ok": True, "docto_guid": docto_guid, "tests": results}


def debug_match_docto_header(docto_guid: str) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    rows = query(
        conn,
        """
        SELECT TOP 1
          f9820_guid,
          f9820_id_tipo_docto,
          f9820_consec_docto,
          f9820_fecha_ts_creacion,
          f9820_fecha_ts_actualizacion
        FROM dbo.t9820_pdv_d_doctos
        WHERE f9820_guid = ?
        """,
        [docto_guid],
    )

    return {"ok": True, "docto_guid": docto_guid, "count": len(rows), "rows": rows}


def debug_table_columns(table_name: str) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    columns = query(
        conn,
        """
        SELECT
          COLUMN_NAME,
          DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        """,
        [table_name],
    )

    return {"ok": True, "table_name": table_name, "count": len(columns), "columns": columns}


def debug_mesa_from_docto(docto_guid: str) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    rowid_mesa, mesa_ref, guid_control_mesa, table_9823 = _resolve_mesa_from_docto(conn, docto_guid)

    return {
        "ok": True,
        "docto_guid": docto_guid,
        "detected_table_9823": table_9823,
        "guid_control_mesa": guid_control_mesa,
        "rowid_mesa": rowid_mesa,
        "mesa_ref": mesa_ref,
    }


def run_siesa_sync(
    db: Session,
    *,
    tipo_docto: str = "01f",
    lookback_minutes: int = 24 * 60,
    limit: int = 300,
) -> dict:
    cfg = load_siesa_config_from_env()
    conn = connect_siesa(cfg)

    last_sync_at, last_rowversion = _get_sync_state(db)
    since = _as_utc(last_sync_at) or (_utc_now() - timedelta(minutes=lookback_minutes))

    res = SyncResult()
    max_seen_ts: Optional[datetime] = _as_utc(last_sync_at)
    max_seen_rv: Optional[int] = last_rowversion

    doctos, used_rowversion, used_fallback = _fetch_doctos(conn, tipo_docto, since, last_rowversion, limit)

    for d in doctos:
        guid = _safe_uuid(d["f9820_guid"])
        pos_id_cia = int(d.get("f9820_id_cia") or 0)
        pos_co = str(d.get("f9820_id_co") or "").strip() or None
        pos_tipo = str(d.get("f9820_id_tipo_docto") or "").strip() or None
        pos_consec = int(d.get("f9820_consec_docto") or 0)

        ts_crea = _as_utc(d.get("f9820_fecha_ts_creacion"))
        ts_upd = _as_utc(d.get("f9820_fecha_ts_actualizacion"))
        hora_pedido = ts_crea or ts_upd or _utc_now()
        pos_ts_actualizacion = ts_upd or ts_crea

        rowversion_num = d.get("rowversion_num")
        if rowversion_num is not None:
            try:
                rowversion_num = int(rowversion_num)
                if max_seen_rv is None or rowversion_num > max_seen_rv:
                    max_seen_rv = rowversion_num
            except Exception:
                rowversion_num = None

        if pos_ts_actualizacion and (max_seen_ts is None or pos_ts_actualizacion > max_seen_ts):
            max_seen_ts = pos_ts_actualizacion

        rowid_mesero = d.get("f9820_rowid_tercero_vendedor")
        if rowid_mesero is not None:
            try:
                rowid_mesero = int(rowid_mesero)
            except Exception:
                rowid_mesero = None

        mesero_nombre = _resolve_mesero_name(conn, rowid_mesero)
        rowid_mesa, mesa_ref, _guid_control_mesa, _table_9823 = _resolve_mesa_from_docto(conn, guid)

        ticket = (
            db.query(KitchenTicket)
            .options(selectinload(KitchenTicket.items))
            .filter(KitchenTicket.pos_docto_guid == guid)
            .first()
        )

        if not ticket:
            ticket = KitchenTicket(
                id=uuid4(),
                pos_docto_guid=guid,
                pos_id_cia=pos_id_cia,
                pos_co=pos_co,
                pos_tipo_docto=pos_tipo,
                pos_consec_docto=pos_consec,
                mesa_ref=mesa_ref,
                pos_rowid_mesa=rowid_mesa,
                pos_rowid_mesero=rowid_mesero,
                mesero_nombre=mesero_nombre,
                hora_pedido=hora_pedido,
                pos_ts_actualizacion=pos_ts_actualizacion,
                status=TicketStatus.PENDIENTE,
                hora_preparacion=None,
                hora_entrega=None,
                comanda_number=_next_comanda_number(db),
                notas=None,
            )
            db.add(ticket)
            db.flush()
            res.new_tickets += 1
        else:
            changed = False

            if pos_ts_actualizacion and (
                ticket.pos_ts_actualizacion is None
                or _as_utc(pos_ts_actualizacion) > _as_utc(ticket.pos_ts_actualizacion)
            ):
                ticket.pos_ts_actualizacion = pos_ts_actualizacion
                changed = True

            if pos_consec and ticket.pos_consec_docto != pos_consec:
                ticket.pos_consec_docto = pos_consec
                changed = True

            if rowid_mesero and ticket.pos_rowid_mesero != rowid_mesero:
                ticket.pos_rowid_mesero = rowid_mesero
                changed = True

            if mesero_nombre and ticket.mesero_nombre != mesero_nombre:
                ticket.mesero_nombre = mesero_nombre
                changed = True

            if mesa_ref and ticket.mesa_ref != mesa_ref:
                ticket.mesa_ref = mesa_ref
                changed = True

            if rowid_mesa and ticket.pos_rowid_mesa != rowid_mesa:
                ticket.pos_rowid_mesa = rowid_mesa
                changed = True

            if changed:
                res.updated_tickets += 1

        lines = query(
            conn,
            """
            SELECT
              f9830_guid,
              f9830_rowid_item_ext,
              f9830_cant_1,
              f9830_cant_base,
              f9830_id_unidad_medida,
              f9830_fecha_ts_actualizacion
            FROM dbo.t9830_pdv_d_movto_venta
            WHERE f9830_guid_docto = ?
            """,
            [str(guid)],
        )

        existing_by_movto = {str(it.pos_movto_guid): it for it in ticket.items}

        for ln in lines:
            movto_guid_raw = ln.get("f9830_guid")
            if not movto_guid_raw:
                res.skipped_items += 1
                continue

            pos_movto_guid = _safe_uuid(movto_guid_raw)

            rowid_item_ext = ln.get("f9830_rowid_item_ext")
            try:
                rowid_item_ext = int(rowid_item_ext) if rowid_item_ext is not None else 0
            except Exception:
                rowid_item_ext = 0

            qty = ln.get("f9830_cant_base")
            try:
                qty = float(qty) if qty is not None else 0.0
            except Exception:
                qty = 0.0

            if qty == 0:
                qty = ln.get("f9830_cant_1")
                try:
                    qty = float(qty) if qty is not None else 0.0
                except Exception:
                    qty = 0.0

            unidad_from_line = ln.get("f9830_id_unidad_medida")
            unidad_from_line = str(unidad_from_line).strip() if unidad_from_line else None

            product_name, unidad_from_item = _resolve_product_name(conn, rowid_item_ext)
            unidad = unidad_from_line or unidad_from_item
            pos_item_ts = _as_utc(ln.get("f9830_fecha_ts_actualizacion"))

            existing = existing_by_movto.get(str(pos_movto_guid))
            if existing:
                item_changed = False

                if existing.pos_rowid_item_ext != rowid_item_ext:
                    existing.pos_rowid_item_ext = rowid_item_ext
                    item_changed = True

                if existing.product_name != product_name:
                    existing.product_name = product_name
                    item_changed = True

                if existing.unidad != unidad:
                    existing.unidad = unidad
                    item_changed = True

                if float(existing.qty or 0) != float(qty or 0):
                    existing.qty = qty
                    item_changed = True

                if pos_item_ts and (
                    existing.pos_ts_actualizacion is None
                    or _as_utc(pos_item_ts) > _as_utc(existing.pos_ts_actualizacion)
                ):
                    existing.pos_ts_actualizacion = pos_item_ts
                    item_changed = True

                if item_changed:
                    res.updated_items += 1
                else:
                    res.skipped_items += 1

                continue

            db.add(
                KitchenTicketItem(
                    id=uuid4(),
                    ticket_id=ticket.id,
                    pos_movto_guid=pos_movto_guid,
                    pos_rowid_item_ext=rowid_item_ext,
                    product_name=product_name,
                    unidad=unidad,
                    qty=qty,
                    pos_ts_actualizacion=pos_item_ts,
                    status=ItemStatus.PENDIENTE,
                )
            )
            res.new_items += 1

    if max_seen_ts or max_seen_rv is not None:
        _set_sync_state(db, max_seen_ts, max_seen_rv)

    db.commit()

    return {
        "ok": True,
        "new_tickets": res.new_tickets,
        "updated_tickets": res.updated_tickets,
        "new_items": res.new_items,
        "updated_items": res.updated_items,
        "skipped_items": res.skipped_items,
        "lookback_minutes": lookback_minutes,
        "tipo_docto": tipo_docto,
        "total_doctos_sqlserver": len(doctos),
        "last_sync_at": max_seen_ts.isoformat() if max_seen_ts else None,
        "last_rowversion": max_seen_rv,
        "used_rowversion": used_rowversion,
        "used_fallback_without_date_filter": used_fallback,
    }
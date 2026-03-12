from __future__ import annotations

import traceback
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.sync_run import SyncRun
from app.services.siesa_sync_service import (
    run_siesa_sync,
    debug_latest_doctos,
    debug_docto_lines,
    debug_tipo_docto_values,
    debug_t9830_sample,
    debug_t9830_by_possible_keys,
    debug_table_columns,
    debug_match_docto_header,
    debug_connection_info,
    debug_mesa_from_docto,
)
from app.services.sync_run_service import (
    start_sync_run,
    finish_sync_run_success,
    finish_sync_run_error,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class SyncIn(BaseModel):
    tipo_docto: str = Field(default="01f")
    lookback_minutes: int = Field(default=24 * 60, ge=10, le=7 * 24 * 60)
    limit: int = Field(default=300, ge=10, le=2000)


class SyncRunOut(BaseModel):
    id: UUID
    source: str
    mode: str
    status: str
    tipo_docto: str | None = None
    lookback_minutes: int | None = None
    limit_rows: int | None = None
    total_doctos_sqlserver: int
    new_tickets: int
    updated_tickets: int
    new_items: int
    updated_items: int
    skipped_items: int
    used_rowversion: bool
    used_fallback_without_date_filter: bool
    last_sync_at: datetime | None = None
    last_rowversion: int | None = None
    started_at: datetime
    ended_at: datetime | None = None
    duration_ms: int | None = None
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/sync")
def sync_now(payload: SyncIn, db: Session = Depends(get_db)):
    run = start_sync_run(
        db,
        source="SIESA",
        mode="MANUAL",
        tipo_docto=payload.tipo_docto,
        lookback_minutes=payload.lookback_minutes,
        limit_rows=payload.limit,
    )
    db.commit()
    db.refresh(run)

    try:
        result = run_siesa_sync(
            db,
            tipo_docto=payload.tipo_docto,
            lookback_minutes=payload.lookback_minutes,
            limit=payload.limit,
        )
        finish_sync_run_success(db, run=run, result=result)
        db.commit()
        return {
            **result,
            "run_id": str(run.id),
            "mode": "MANUAL",
        }
    except Exception as e:
        traceback.print_exc()
        finish_sync_run_error(db, run=run, error_message=repr(e))
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error ejecutando sync: {repr(e)}")


@router.get("/sync/runs", response_model=list[SyncRunOut])
def list_sync_runs(
    source: str = Query(default="SIESA"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SyncRun)
        .filter(SyncRun.source == source)
        .order_by(SyncRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.get("/sync/runs/latest", response_model=SyncRunOut | None)
def latest_sync_run(
    source: str = Query(default="SIESA"),
    db: Session = Depends(get_db),
):
    row = (
        db.query(SyncRun)
        .filter(SyncRun.source == source)
        .order_by(SyncRun.started_at.desc())
        .first()
    )
    return row


@router.get("/sync/debug/connection-info")
def sync_debug_connection_info():
    try:
        return debug_connection_info()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug connection info: {repr(e)}")


@router.get("/sync/debug/doctos")
def sync_debug_doctos(
    tipo_docto: str = Query(default="01f"),
    limit: int = Query(default=20, ge=1, le=200),
):
    try:
        return debug_latest_doctos(tipo_docto=tipo_docto, limit=limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug doctos: {repr(e)}")


@router.get("/sync/debug/lines/{docto_guid}")
def sync_debug_lines(docto_guid: str):
    try:
        return debug_docto_lines(docto_guid=docto_guid)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug lines: {repr(e)}")


@router.get("/sync/debug/tipos")
def sync_debug_tipos(limit: int = Query(default=50, ge=1, le=200)):
    try:
        return debug_tipo_docto_values(limit=limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug tipos: {repr(e)}")


@router.get("/sync/debug/t9830/sample")
def sync_debug_t9830_sample(limit: int = Query(default=20, ge=1, le=100)):
    try:
        return debug_t9830_sample(limit=limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug t9830 sample: {repr(e)}")


@router.get("/sync/debug/t9830/by-guid/{docto_guid}")
def sync_debug_t9830_by_guid(docto_guid: str, limit: int = Query(default=20, ge=1, le=100)):
    try:
        return debug_t9830_by_possible_keys(docto_guid=docto_guid, limit=limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug t9830 by guid: {repr(e)}")


@router.get("/sync/debug/table-columns")
def sync_debug_table_columns(table_name: str = Query(...)):
    try:
        return debug_table_columns(table_name=table_name)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug table columns: {repr(e)}")


@router.get("/sync/debug/match-docto/{docto_guid}")
def sync_debug_match_docto(docto_guid: str):
    try:
        return debug_match_docto_header(docto_guid=docto_guid)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug match docto: {repr(e)}")


@router.get("/sync/debug/mesa-from-docto/{docto_guid}")
def sync_debug_mesa_from_docto(docto_guid: str):
    try:
        return debug_mesa_from_docto(docto_guid=docto_guid)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error debug mesa from docto: {repr(e)}")
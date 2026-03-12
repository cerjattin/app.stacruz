from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.sync_run import SyncRun


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def start_sync_run(
    db: Session,
    *,
    source: str,
    mode: str,
    tipo_docto: Optional[str],
    lookback_minutes: Optional[int],
    limit_rows: Optional[int],
) -> SyncRun:
    run = SyncRun(
        source=source,
        mode=mode,
        status="RUNNING",
        tipo_docto=tipo_docto,
        lookback_minutes=lookback_minutes,
        limit_rows=limit_rows,
        started_at=_utc_now(),
    )
    db.add(run)
    db.flush()
    return run


def finish_sync_run_success(
    db: Session,
    *,
    run: SyncRun,
    result: dict,
) -> SyncRun:
    ended_at = _utc_now()
    duration_ms = int((ended_at - run.started_at).total_seconds() * 1000)

    run.status = "SUCCESS"
    run.ended_at = ended_at
    run.duration_ms = duration_ms

    run.total_doctos_sqlserver = int(result.get("total_doctos_sqlserver") or 0)
    run.new_tickets = int(result.get("new_tickets") or 0)
    run.updated_tickets = int(result.get("updated_tickets") or 0)
    run.new_items = int(result.get("new_items") or 0)
    run.updated_items = int(result.get("updated_items") or 0)
    run.skipped_items = int(result.get("skipped_items") or 0)

    run.used_rowversion = bool(result.get("used_rowversion") or False)
    run.used_fallback_without_date_filter = bool(result.get("used_fallback_without_date_filter") or False)

    run.last_sync_at = result.get("last_sync_at")
    if isinstance(run.last_sync_at, str):
        run.last_sync_at = datetime.fromisoformat(run.last_sync_at.replace("Z", "+00:00"))

    last_rowversion = result.get("last_rowversion")
    run.last_rowversion = int(last_rowversion) if last_rowversion is not None else None

    db.add(run)
    return run


def finish_sync_run_error(
    db: Session,
    *,
    run: SyncRun,
    error_message: str,
) -> SyncRun:
    ended_at = _utc_now()
    duration_ms = int((ended_at - run.started_at).total_seconds() * 1000)

    run.status = "ERROR"
    run.ended_at = ended_at
    run.duration_ms = duration_ms
    run.error_message = error_message[:4000] if error_message else "Unknown error"

    db.add(run)
    return run
from __future__ import annotations

import threading
import time
import traceback

from app.db.session import SessionLocal
from app.services.siesa_sync_service import run_siesa_sync
from app.services.sync_run_service import (
    start_sync_run,
    finish_sync_run_success,
    finish_sync_run_error,
)


def _sync_loop():
    while True:
        db = SessionLocal()
        try:
            run = start_sync_run(
                db,
                source="SIESA",
                mode="AUTO",
                tipo_docto="01f",
                lookback_minutes=1440,
                limit_rows=300,
            )
            db.commit()
            db.refresh(run)

            result = run_siesa_sync(
                db,
                tipo_docto="01f",
                lookback_minutes=1440,
                limit=300,
            )

            finish_sync_run_success(db, run=run, result=result)
            db.commit()

            print(
                "[SIESA SYNC LOOP] SUCCESS",
                f"new_tickets={result.get('new_tickets', 0)}",
                f"updated_tickets={result.get('updated_tickets', 0)}",
                f"new_items={result.get('new_items', 0)}",
            )
        except Exception as e:
            traceback.print_exc()
            try:
                finish_sync_run_error(db, run=run, error_message=repr(e))  # noqa: F821
                db.commit()
            except Exception:
                db.rollback()
            print(f"[SIESA SYNC LOOP] ERROR {e}")
        finally:
            db.close()

        time.sleep(300)


def start_siesa_scheduler():
    t = threading.Thread(target=_sync_loop, daemon=True)
    t.start()
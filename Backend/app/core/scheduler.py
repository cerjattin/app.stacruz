from __future__ import annotations

import os
import threading
import time
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.services.siesa_sync_service import run_siesa_sync


def _minutes() -> int:
    try:
        return int(os.getenv("SIESA_SYNC_INTERVAL_MINUTES", "5"))
    except Exception:
        return 5


def start_siesa_sync_loop():
    interval = max(1, _minutes())

    def loop():
        while True:
            try:
                db = SessionLocal()
                run_siesa_sync(db)
            except Exception:
                # No reventar el server
                pass
            finally:
                try:
                    db.close()
                except Exception:
                    pass
            time.sleep(interval * 60)

    t = threading.Thread(target=loop, daemon=True)
    t.start()
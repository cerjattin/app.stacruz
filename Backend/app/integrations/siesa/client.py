from __future__ import annotations

import os
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pyodbc


@dataclass(frozen=True)
class SiesaConnSettings:
    host: str
    port: int
    db: str
    user: str
    password: str
    driver: str = "ODBC Driver 18 for SQL Server"
    encrypt: bool = True
    trust_server_certificate: bool = True  # útil en LAN / self-signed


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def get_siesa_settings_from_env() -> Optional[SiesaConnSettings]:
    host = _env("SIESA_SQLSERVER_HOST")
    db = _env("SIESA_SQLSERVER_DB")
    user = _env("SIESA_SQLSERVER_USER")
    password = _env("SIESA_SQLSERVER_PASSWORD")
    driver = _env("SIESA_SQLSERVER_DRIVER", "ODBC Driver 18 for SQL Server")
    port = int(_env("SIESA_SQLSERVER_PORT", "1433") or "1433")

    # Si no está configurado (dejaste __IP_O_HOST__), retornamos None
    if not host or host.startswith("__") or not db or db.startswith("__") or not user or user.startswith("__"):
        return None

    return SiesaConnSettings(
        host=host,
        port=port,
        db=db,
        user=user,
        password=password,
        driver=driver,
        encrypt=True,
        trust_server_certificate=True,
    )


def build_conn_str(s: SiesaConnSettings) -> str:
    # Nota: TrustServerCertificate=True ayuda cuando SQLServer tiene cert no confiable en red local.
    return (
        f"DRIVER={{{s.driver}}};"
        f"SERVER={s.host},{s.port};"
        f"DATABASE={s.db};"
        f"UID={s.user};"
        f"PWD={s.password};"
        f"Encrypt={'yes' if s.encrypt else 'no'};"
        f"TrustServerCertificate={'yes' if s.trust_server_certificate else 'no'};"
        "Connection Timeout=10;"
    )


@contextmanager
def siesa_connection(settings: SiesaConnSettings):
    conn = pyodbc.connect(build_conn_str(settings))
    try:
        yield conn
    finally:
        conn.close()


def fetch_all(conn, sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    rows = cur.fetchall()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({cols[i]: r[i] for i in range(len(cols))})
    return out
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, List, Optional

import pyodbc
from dotenv import load_dotenv

# =====================================
# Cargar .env del backend
# =====================================

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)


# =====================================
# Config
# =====================================

@dataclass(frozen=True)
class SiesaSqlConfig:
    host: str
    db: str
    odbc_driver: str
    instance: Optional[str] = None
    port: Optional[int] = None
    trusted: bool = False
    user: Optional[str] = None
    password: Optional[str] = None
    encrypt: str = "no"
    trust_server_certificate: str = "yes"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def load_siesa_config_from_env() -> SiesaSqlConfig:

    host = _env("SIESA_SQLSERVER_HOST", "localhost")
    instance = _env("SIESA_SQLSERVER_INSTANCE") or None
    port_raw = _env("SIESA_SQLSERVER_PORT")
    port = int(port_raw) if port_raw.isdigit() else None

    trusted = _env("SIESA_SQLSERVER_TRUSTED") == "1"

    return SiesaSqlConfig(
        host=host,
        instance=instance,
        port=port,
        db=_env("SIESA_SQLSERVER_DB"),
        odbc_driver=_env("SIESA_SQLSERVER_ODBC_DRIVER", "ODBC Driver 17 for SQL Server"),
        trusted=trusted,
        user=_env("SIESA_SQLSERVER_USER") or None,
        password=_env("SIESA_SQLSERVER_PASSWORD") or None,
        encrypt=_env("SIESA_SQLSERVER_ENCRYPT", "no"),
        trust_server_certificate=_env("SIESA_SQLSERVER_TRUST_CERT", "yes"),
    )


# =====================================
# Server builder
# =====================================

def _build_server(cfg: SiesaSqlConfig) -> str:

    if cfg.instance:
        return f"{cfg.host}\\{cfg.instance}"

    if cfg.port:
        return f"{cfg.host},{cfg.port}"

    return cfg.host


# =====================================
# Connection
# =====================================

def connect_siesa(cfg: SiesaSqlConfig) -> pyodbc.Connection:

    if not cfg.db:
        raise RuntimeError("Falta variable SIESA_SQLSERVER_DB")

    server = _build_server(cfg)

    if cfg.trusted:

        conn_str = (
            f"DRIVER={{{cfg.odbc_driver}}};"
            f"SERVER={server};"
            f"DATABASE={cfg.db};"
            "Trusted_Connection=yes;"
            f"Encrypt={cfg.encrypt};"
            f"TrustServerCertificate={cfg.trust_server_certificate};"
        )

    else:

        if not cfg.user:
            raise RuntimeError("Falta SIESA_SQLSERVER_USER")

        conn_str = (
            f"DRIVER={{{cfg.odbc_driver}}};"
            f"SERVER={server};"
            f"DATABASE={cfg.db};"
            f"UID={cfg.user};"
            f"PWD={cfg.password};"
            f"Encrypt={cfg.encrypt};"
            f"TrustServerCertificate={cfg.trust_server_certificate};"
        )

    return pyodbc.connect(conn_str, autocommit=True)


# =====================================
# Helpers
# =====================================

def fetchall_dict(cur: pyodbc.Cursor) -> List[dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    rows = cur.fetchall()

    return [
        {cols[i]: row[i] for i in range(len(cols))}
        for row in rows
    ]


def query(conn: pyodbc.Connection, sql: str, params: Iterable[Any] = ()) -> List[dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(sql, tuple(params))
    return fetchall_dict(cur)
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, List, Optional

import pyodbc
from dotenv import load_dotenv

# ✅ Carga explícita del .env del backend
# Ajusta automáticamente desde este archivo:
# Backend/app/integrations/siesa_sqlserver.py -> Backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


@dataclass(frozen=True)
class SiesaSqlConfig:
    host: str
    db: str
    user: str
    password: str
    odbc_driver: str
    instance: Optional[str] = None
    port: Optional[int] = None
    encrypt: str = "no"
    trust_server_certificate: str = "yes"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def load_siesa_config_from_env() -> SiesaSqlConfig:
    host = _env("SIESA_SQLSERVER_HOST", "localhost")

    # Para SQL Express local normalmente conviene esto:
    # SIESA_SQLSERVER_INSTANCE=SQLEXPRESS
    instance = _env("SIESA_SQLSERVER_INSTANCE")
    instance = instance or None

    port_raw = _env("SIESA_SQLSERVER_PORT")
    port = int(port_raw) if port_raw.isdigit() else None

    return SiesaSqlConfig(
        host=host,
        instance=instance,
        port=port,
        db=_env("SIESA_SQLSERVER_DB"),
        user=_env("SIESA_SQLSERVER_USER"),
        password=_env("SIESA_SQLSERVER_PASSWORD"),
        # ✅ OJO: este es el nombre correcto
        odbc_driver=_env("SIESA_SQLSERVER_ODBC_DRIVER", "ODBC Driver 17 for SQL Server"),
        encrypt=_env("SIESA_SQLSERVER_ENCRYPT", "no"),
        trust_server_certificate=_env("SIESA_SQLSERVER_TRUST_CERT", "yes"),
    )


def _build_server(cfg: SiesaSqlConfig) -> str:
    if cfg.instance:
        return f"{cfg.host}\\{cfg.instance}"
    if cfg.port:
        return f"{cfg.host},{cfg.port}"
    return cfg.host


def connect_siesa(cfg: SiesaSqlConfig) -> pyodbc.Connection:
    if not cfg.db or not cfg.user:
        raise RuntimeError(
            "Faltan variables SIESA_SQLSERVER_DB / SIESA_SQLSERVER_USER. "
            f"ENV leído desde: {ENV_PATH}"
        )

    server = _build_server(cfg)

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


def fetchall_dict(cur: pyodbc.Cursor) -> List[dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    rows = cur.fetchall()
    return [{cols[i]: row[i] for i in range(len(cols))} for row in rows]


def query(conn: pyodbc.Connection, sql: str, params: Iterable[Any] = ()) -> List[dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(sql, tuple(params))
    return fetchall_dict(cur)
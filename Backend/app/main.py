from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router

from app.routers.tickets import router as tickets_router
from app.routers.dev_seed import router as dev_seed_router
from app.routers.siesa_sync import router as siesa_sync_router
from app.core.scheduler import start_siesa_sync_loop
from app.core.siesa_scheduler import start_siesa_scheduler


app = FastAPI(title="Comandas Zeus - Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(tickets_router)
app.include_router(dev_seed_router)
app.include_router(siesa_sync_router)

start_siesa_scheduler()

if settings.ENV == "dev":
    start_siesa_sync_loop()
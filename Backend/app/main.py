from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router

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

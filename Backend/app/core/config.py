from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    ENV: str = "dev"
    CORS_ORIGINS: str = "http://localhost:5173"

    @field_validator("CORS_ORIGINS")
    @classmethod
    def normalize_cors(cls, v: str) -> str:
        return ",".join([x.strip() for x in v.split(",") if x.strip()])

    def cors_list(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]

settings = Settings()

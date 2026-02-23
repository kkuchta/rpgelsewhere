from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve DB path relative to this file so it works regardless of CWD.
# backend/app/config.py → parents[2] = repo root → data/entries.db
_default_db_path = Path(__file__).resolve().parents[2] / "data" / "entries.db"
_default_db_url = f"sqlite:///{_default_db_path}"


class Settings(BaseSettings):
    database_url: str = _default_db_url

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

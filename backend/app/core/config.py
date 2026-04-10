from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "足球分析系统二代版"
    app_env: str = "development"
    api_prefix: str = "/api"
    request_timeout_seconds: int = 30
    data_dir: Path = Path("data")
    archive_dir: Path = Path("data/archive")
    prompt_dir: Path = Path("data/prompts")

    model_config = SettingsConfigDict(env_prefix="FOOTBALL_V2_", env_file=".env", extra="ignore")


settings = Settings()


def ensure_runtime_dirs() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.archive_dir.mkdir(parents=True, exist_ok=True)
    settings.prompt_dir.mkdir(parents=True, exist_ok=True)

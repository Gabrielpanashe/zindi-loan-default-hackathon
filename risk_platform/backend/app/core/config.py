from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent  # backend/app/core/config.py -> backend/
_REPO_ROOT = _BACKEND_ROOT.parent.parent  # backend/ -> risk_platform/ -> repo root


def _default_db_url() -> str:
    data_dir = _BACKEND_ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'platform.db'}"


def _default_batch_dir() -> Path:
    d = _BACKEND_ROOT / "data" / "batches"
    d.mkdir(parents=True, exist_ok=True)
    return d


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Loan Risk Intelligence API"
    database_url: str = _default_db_url()
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8
    artifacts_dir: str | None = None
    admin_email: str = "admin@localhost"
    admin_password: str = "admin123"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    celery_task_always_eager: bool = False

    batch_storage_dir: str = str(_default_batch_dir())
    use_alembic: bool = True

    @property
    def broker_url(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url

    @property
    def repo_root(self) -> Path:
        return _REPO_ROOT

    @property
    def artifacts_path(self) -> Path:
        if self.artifacts_dir:
            return Path(self.artifacts_dir)
        return _REPO_ROOT / "risk_platform" / "artifacts" / "v1"

    @property
    def batch_dir(self) -> Path:
        p = Path(self.batch_storage_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()

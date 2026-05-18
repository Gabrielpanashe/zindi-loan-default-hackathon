from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
def readyz(db: Session = Depends(get_db)) -> dict[str, str | bool]:
    db.execute(text("SELECT 1"))
    settings = get_settings()
    art = settings.artifacts_path
    manifest_ok = (art / "manifest.json").exists()
    redis_ok = False
    try:
        import redis

        r = redis.from_url(settings.redis_url, socket_connect_timeout=1)
        redis_ok = r.ping()
    except Exception:
        redis_ok = False
    ready = manifest_ok
    return {
        "status": "ready" if ready else "degraded",
        "artifacts": manifest_ok,
        "redis": redis_ok,
    }

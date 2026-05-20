from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import applications, audit, auth, batch, chat, dashboard, health, policies, simulations
from app.bootstrap import seed_if_empty
from app.core.config import get_settings
from app.db.migrate import run_migrations
from app.db.session import SessionLocal

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.use_alembic:
        run_migrations()
    with SessionLocal() as db:
        seed_if_empty(db, settings)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Always-allowed origins (hardcoded for reliability on Railway/Vercel)
_ALWAYS_ALLOW = [
    "https://zindi-loan-default-hackathon.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
# Merge with any extra origins from the environment variable
_env_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
_origins = list({*_ALWAYS_ALLOW, *_env_origins})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(auth.router, prefix=API)
app.include_router(applications.router, prefix=API)
app.include_router(policies.router, prefix=API)
app.include_router(dashboard.router, prefix=API)
app.include_router(batch.router, prefix=API)
app.include_router(simulations.router, prefix=API)
app.include_router(audit.router, prefix=API)
app.include_router(chat.router, prefix=API)
app.include_router(health.router, prefix=API)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs", "api": API}

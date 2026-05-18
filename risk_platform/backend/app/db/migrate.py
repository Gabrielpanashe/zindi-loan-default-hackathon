from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import get_settings
from app.db.session import engine
from app.models import Base


def run_migrations() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    ini_path = backend_root / "alembic.ini"
    if ini_path.exists():
        cfg = Config(str(ini_path))
        cfg.set_main_option("sqlalchemy.url", get_settings().database_url)
        command.upgrade(cfg, "head")
    else:
        Base.metadata.create_all(bind=engine)

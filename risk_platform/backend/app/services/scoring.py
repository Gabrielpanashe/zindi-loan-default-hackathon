from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import AuditLog, InstitutionPolicy, ModelVersion, User


def log_audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    detail: dict | None = None,
) -> None:
    row = AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    )
    db.add(row)


def ensure_default_policy(db: Session) -> InstitutionPolicy:
    row = db.query(InstitutionPolicy).first()
    if row:
        return row
    row = InstitutionPolicy(name="default")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def ensure_model_version_row(db: Session, settings: Settings) -> ModelVersion:
    art = settings.artifacts_path
    manifest = art / "manifest.json"
    ver = "v1"
    if manifest.exists():
        import json

        with open(manifest, encoding="utf-8") as f:
            ver = json.load(f).get("model_version", "v1")
    existing = db.query(ModelVersion).filter(ModelVersion.version == ver).first()
    if existing:
        return existing
    mv = ModelVersion(version=ver, manifest_path=str(manifest))
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv

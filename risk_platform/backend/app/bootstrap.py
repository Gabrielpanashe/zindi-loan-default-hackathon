from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import get_password_hash
from app.models import User
from app.services.scoring import ensure_default_policy, ensure_model_version_row


def seed_if_empty(db: Session, settings: Settings) -> None:
    ensure_default_policy(db)
    ensure_model_version_row(db, settings)
    if db.query(User).first():
        return
    admin = User(
        email=settings.admin_email,
        hashed_password=get_password_hash(settings.admin_password),
        role="admin",
    )
    db.add(admin)
    officer = User(
        email="officer@localhost",
        hashed_password=get_password_hash("officer123"),
        role="loan_officer",
    )
    db.add(officer)
    analyst = User(
        email="analyst@localhost",
        hashed_password=get_password_hash("analyst123"),
        role="risk_analyst",
    )
    db.add(analyst)
    applicant = User(
        email="applicant@localhost",
        hashed_password=get_password_hash("applicant123"),
        role="applicant",
    )
    db.add(applicant)
    db.commit()

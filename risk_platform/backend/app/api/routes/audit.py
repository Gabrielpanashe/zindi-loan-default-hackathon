from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import AuditLog, User
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "risk_analyst")),
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(min(limit, 500))
        .all()
    )

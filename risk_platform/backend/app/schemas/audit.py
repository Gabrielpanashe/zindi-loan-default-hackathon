from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    actor_id: int | None
    action: str
    entity_type: str | None
    entity_id: int | None
    detail: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}

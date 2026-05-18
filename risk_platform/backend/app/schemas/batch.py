from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BatchJobOut(BaseModel):
    id: int
    status: str
    input_filename: str
    result_path: str | None
    summary: dict[str, Any] | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}

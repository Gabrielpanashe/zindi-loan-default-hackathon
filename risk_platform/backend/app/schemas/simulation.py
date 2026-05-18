from typing import Any

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    base_application_id: int | None = None
    raw_payload: dict[str, Any] | None = None
    deltas: dict[str, Any] = Field(default_factory=dict)


class SimulationResponse(BaseModel):
    baseline: dict[str, Any]
    scenario: dict[str, Any]
    delta_probability_default: float

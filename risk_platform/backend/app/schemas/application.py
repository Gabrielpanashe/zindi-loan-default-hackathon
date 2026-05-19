from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LoanApplicationCreate(BaseModel):
    applicant_segment: str | None = Field(default=None, max_length=64)
    raw_payload: dict[str, Any]


class LoanApplicationOut(BaseModel):
    id: int
    creator_id: int
    applicant_segment: str | None
    raw_payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ScoreOut(BaseModel):
    prediction_id: int
    application_id: int = 0  # populated by score_application route
    probability_default: float
    recommendation: str
    risk_tier: str
    explanation: dict[str, Any]
    policy_snapshot: dict[str, Any]


class FriendlyApplicationCreate(BaseModel):
    applicant_segment: str = Field(default="sme", max_length=64)
    monthly_income_usd: float = Field(gt=0)
    amount_usd: float = Field(gt=0)
    term_months: int = Field(default=12, ge=1, le=360)
    employment_sector: str | None = None
    loan_purpose: str | None = None
    existing_obligations: int = Field(default=0, ge=0)
    months_at_employer: float | None = None
    num_dependents: float | None = None
    annual_rate_pct: float | None = None
    province: str = "Harare"
    product_code: int | None = None
    payment_frequency: str = "Monthly"
    client_gender: str = "Male"
    marital_status: str = "Single"
    collateral_type: str | None = None
    disbursement_channel: str = "Branch"
    external_id: str | None = None

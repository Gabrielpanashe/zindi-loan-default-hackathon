from __future__ import annotations

import time

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models import LoanApplication, User
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.decision import decision_from_pd
from app.services.mapper import apply_deltas, build_raw_payload
from app.services.ml_engine import get_inference_engine
from app.services.scoring import ensure_default_policy, log_audit

router = APIRouter(prefix="/simulations", tags=["simulations"])


def _score_payload(raw: dict, policy) -> dict:
    engine = get_inference_engine()
    expl = engine.explain(pd.DataFrame([raw]))
    pd_value = float(expl["probability_default"])
    dec = decision_from_pd(
        pd_value,
        approve_pd_max=policy.approve_pd_max,
        review_pd_max=policy.review_pd_max,
    )
    return {
        "raw_payload": raw,
        "probability_default": pd_value,
        "recommendation": dec["recommendation"],
        "risk_tier": dec["risk_tier"],
        "explanation": expl,
    }


@router.post("", response_model=SimulationResponse)
def run_simulation(
    body: SimulationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer", "risk_analyst")),
) -> SimulationResponse:
    settings = get_settings()
    policy = ensure_default_policy(db)

    if body.base_application_id is not None:
        app_row = db.get(LoanApplication, body.base_application_id)
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found")
        if user.role not in ("admin", "risk_analyst") and app_row.creator_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        baseline_raw = dict(app_row.raw_payload)
    elif body.raw_payload:
        baseline_raw = dict(body.raw_payload)
    else:
        raise HTTPException(status_code=400, detail="Provide base_application_id or raw_payload")

    try:
        baseline = _score_payload(baseline_raw, policy)
        scenario_raw = apply_deltas(baseline_raw, body.deltas)
        scenario = _score_payload(scenario_raw, policy)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    delta_pd = scenario["probability_default"] - baseline["probability_default"]
    log_audit(
        db,
        actor=user,
        action="simulation.run",
        entity_type="loan_application",
        entity_id=body.base_application_id,
        detail={"delta_pd": delta_pd, "deltas": body.deltas},
    )
    db.commit()

    return SimulationResponse(
        baseline=baseline,
        scenario=scenario,
        delta_probability_default=delta_pd,
    )

from __future__ import annotations

import time

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models import Decision, LoanApplication, Prediction, User
from app.schemas.application import (
    FriendlyApplicationCreate,
    LoanApplicationCreate,
    LoanApplicationOut,
    ScoreOut,
)
from app.services.mapper import build_raw_payload
from app.services.decision import decision_from_pd
from app.services.ml_engine import get_inference_engine
from app.services.scoring import ensure_default_policy, ensure_model_version_row, log_audit

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/my", response_model=list[LoanApplicationOut])
def my_applications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LoanApplication]:
    return (
        db.query(LoanApplication)
        .filter(LoanApplication.creator_id == user.id)
        .order_by(desc(LoanApplication.created_at))
        .limit(20)
        .all()
    )


@router.post("/friendly", response_model=LoanApplicationOut)
def create_friendly_application(
    body: FriendlyApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer", "applicant")),
) -> LoanApplication:
    raw_payload = build_raw_payload(body.model_dump())
    row = LoanApplication(
        creator_id=user.id,
        applicant_segment=body.applicant_segment,
        raw_payload=raw_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_audit(db, actor=user, action="application.create_friendly", entity_type="loan_application", entity_id=row.id)
    db.commit()
    return row


@router.post("/friendly/score", response_model=ScoreOut)
def create_and_score_friendly(
    body: FriendlyApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer", "applicant")),
) -> ScoreOut:
    raw_payload = build_raw_payload(body.model_dump())
    row = LoanApplication(
        creator_id=user.id,
        applicant_segment=body.applicant_segment,
        raw_payload=raw_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_audit(db, actor=user, action="application.create_friendly", entity_type="loan_application", entity_id=row.id)
    db.commit()
    return score_application(row.id, db, user)


@router.post("", response_model=LoanApplicationOut)
def create_application(
    body: LoanApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer")),
) -> LoanApplication:
    row = LoanApplication(
        creator_id=user.id,
        applicant_segment=body.applicant_segment,
        raw_payload=body.raw_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_audit(db, actor=user, action="application.create", entity_type="loan_application", entity_id=row.id)
    db.commit()
    return row


@router.get("/{application_id}", response_model=LoanApplicationOut)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LoanApplication:
    row = db.get(LoanApplication, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role not in ("admin", "risk_analyst") and row.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return row


@router.post("/{application_id}/score", response_model=ScoreOut)
def score_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer")),
) -> ScoreOut:
    settings = get_settings()
    app_row = db.get(LoanApplication, application_id)
    if not app_row:
        raise HTTPException(status_code=404, detail="Not found")
    if app_row.creator_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    raw_df = pd.DataFrame([app_row.raw_payload])
    t0 = time.perf_counter()
    try:
        engine = get_inference_engine()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    expl = engine.explain(raw_df)
    pd_value = float(expl["probability_default"])
    latency_ms = (time.perf_counter() - t0) * 1000

    policy = ensure_default_policy(db)
    dec = decision_from_pd(
        pd_value,
        approve_pd_max=policy.approve_pd_max,
        review_pd_max=policy.review_pd_max,
    )
    dec["policy_snapshot"] = {
        **dec["policy_snapshot"],
        "policy_id": policy.id,
        "policy_name": policy.name,
    }

    mv = ensure_model_version_row(db, settings)
    pred = Prediction(
        application_id=app_row.id,
        model_version_id=mv.id,
        probability_default=pd_value,
        explanation=expl,
        latency_ms=latency_ms,
    )
    db.add(pred)
    db.flush()
    decision_row = Decision(
        prediction_id=pred.id,
        recommendation=dec["recommendation"],
        risk_tier=dec["risk_tier"],
        policy_snapshot=dec["policy_snapshot"],
    )
    db.add(decision_row)
    log_audit(
        db,
        actor=user,
        action="application.score",
        entity_type="loan_application",
        entity_id=app_row.id,
        detail={"prediction_id": pred.id, "pd": pd_value},
    )
    db.commit()
    db.refresh(pred)

    return ScoreOut(
        prediction_id=pred.id,
        probability_default=pd_value,
        recommendation=dec["recommendation"],
        risk_tier=dec["risk_tier"],
        explanation=expl,
        policy_snapshot=dec["policy_snapshot"],
    )


@router.get("/{application_id}/latest-score", response_model=ScoreOut)
def latest_score(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScoreOut:
    app_row = db.get(LoanApplication, application_id)
    if not app_row:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role not in ("admin", "risk_analyst") and app_row.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    pred = (
        db.query(Prediction)
        .filter(Prediction.application_id == application_id)
        .order_by(desc(Prediction.created_at))
        .first()
    )
    if not pred:
        raise HTTPException(status_code=404, detail="No score for this application yet")
    dec = db.query(Decision).filter(Decision.prediction_id == pred.id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision missing")
    return ScoreOut(
        prediction_id=pred.id,
        probability_default=pred.probability_default,
        recommendation=dec.recommendation,
        risk_tier=dec.risk_tier,
        explanation=pred.explanation or {},
        policy_snapshot=dec.policy_snapshot,
    )

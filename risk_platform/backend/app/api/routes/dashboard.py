from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import Decision, LoanApplication, Prediction, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "risk_analyst", "loan_officer")),
) -> dict:
    n_apps = db.query(func.count(LoanApplication.id)).scalar() or 0
    n_preds = db.query(func.count(Prediction.id)).scalar() or 0
    n_appr = db.query(func.count(Decision.id)).filter(Decision.recommendation == "approve").scalar() or 0
    n_rev = db.query(func.count(Decision.id)).filter(Decision.recommendation == "manual_review").scalar() or 0
    n_rej = db.query(func.count(Decision.id)).filter(Decision.recommendation == "reject").scalar() or 0
    avg_pd = db.query(func.avg(Prediction.probability_default)).scalar()

    approval_rate = (n_appr / n_preds) if n_preds else 0.0
    rejection_rate = (n_rej / n_preds) if n_preds else 0.0

    return {
        "total_applications": int(n_apps),
        "total_predictions": int(n_preds),
        "decisions_approve": int(n_appr),
        "decisions_manual_review": int(n_rev),
        "decisions_reject": int(n_rej),
        "approval_rate": round(approval_rate, 4),
        "rejection_rate": round(rejection_rate, 4),
        "avg_probability_default": float(avg_pd) if avg_pd is not None else None,
    }


@router.get("/charts")
def dashboard_charts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "risk_analyst", "loan_officer")),
) -> dict:
    risk_distribution = {"low": 0, "medium": 0, "high": 0}
    for tier, cnt in (
        db.query(Decision.risk_tier, func.count(Decision.id))
        .group_by(Decision.risk_tier)
        .all()
    ):
        if tier in risk_distribution:
            risk_distribution[tier] = int(cnt)

    rec_distribution = {"approve": 0, "manual_review": 0, "reject": 0}
    for rec, cnt in (
        db.query(Decision.recommendation, func.count(Decision.id))
        .group_by(Decision.recommendation)
        .all()
    ):
        if rec in rec_distribution:
            rec_distribution[rec] = int(cnt)

    segment_stats: dict[str, dict] = defaultdict(lambda: {"count": 0, "pd_sum": 0.0, "approve": 0})
    apps = (
        db.query(LoanApplication)
        .options(joinedload(LoanApplication.predictions))
        .all()
    )
    for app in apps:
        seg = app.applicant_segment or "unspecified"
        segment_stats[seg]["count"] += 1
        if app.predictions:
            latest = max(app.predictions, key=lambda p: p.created_at)
            segment_stats[seg]["pd_sum"] += latest.probability_default
            dec = (
                db.query(Decision)
                .filter(Decision.prediction_id == latest.id)
                .first()
            )
            if dec and dec.recommendation == "approve":
                segment_stats[seg]["approve"] += 1

    segment_breakdown = []
    for seg, st in segment_stats.items():
        n = st["count"]
        preds_n = sum(1 for a in apps if (a.applicant_segment or "unspecified") == seg and a.predictions)
        segment_breakdown.append(
            {
                "segment": seg,
                "applications": n,
                "avg_pd": round(st["pd_sum"] / preds_n, 4) if preds_n else None,
                "approval_rate": round(st["approve"] / preds_n, 4) if preds_n else None,
            }
        )

    monthly: dict[str, int] = defaultdict(int)
    for (created_at,) in db.query(LoanApplication.created_at).all():
        if created_at:
            key = created_at.strftime("%Y-%m")
            monthly[key] += 1
    monthly_trends = [{"month": m, "applications": c} for m, c in sorted(monthly.items())]

    pd_buckets = {"0-0.3": 0, "0.3-0.6": 0, "0.6-1.0": 0}
    for pd_val, in db.query(Prediction.probability_default).all():
        if pd_val is None:
            continue
        if pd_val <= 0.3:
            pd_buckets["0-0.3"] += 1
        elif pd_val <= 0.6:
            pd_buckets["0.3-0.6"] += 1
        else:
            pd_buckets["0.6-1.0"] += 1

    return {
        "risk_distribution": risk_distribution,
        "recommendation_distribution": rec_distribution,
        "segment_breakdown": segment_breakdown,
        "monthly_application_trends": monthly_trends,
        "pd_histogram": [{"bucket": k, "count": v} for k, v in pd_buckets.items()],
    }

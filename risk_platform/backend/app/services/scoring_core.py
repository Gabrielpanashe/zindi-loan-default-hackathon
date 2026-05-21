"""Shared scoring logic for API, batch worker, and simulations."""

from __future__ import annotations

import time
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.services.decision import decision_from_pd
from app.services.ml_engine import get_inference_engine
from app.services.scoring import ensure_default_policy, ensure_model_version_row


def score_dataframe(
    df: pd.DataFrame,
    *,
    explain: bool = True,
    top_k: int = 5,
    approve_pd_max: float = 0.30,
    review_pd_max: float = 0.60,
) -> list[dict[str, Any]]:
    engine = get_inference_engine()
    results: list[dict[str, Any]] = []

    if not explain:
        # Vectorized path: one transform + one model call for all rows
        t0 = time.perf_counter()
        proba = engine.predict_proba(df)
        total_ms = (time.perf_counter() - t0) * 1000
        per_row_ms = total_ms / max(len(df), 1)
        for idx, pd_value in enumerate(proba):
            pd_value = float(pd_value)
            dec = decision_from_pd(
                pd_value, approve_pd_max=approve_pd_max, review_pd_max=review_pd_max
            )
            row_id = df.iloc[idx].get("ID") if "ID" in df.columns else None
            results.append(
                {
                    "row_index": idx,
                    "ID": row_id,
                    "probability_default": pd_value,
                    "recommendation": dec["recommendation"],
                    "risk_tier": dec["risk_tier"],
                    "explanation": {"probability_default": pd_value, "top_contributions": [], "narratives": []},
                    "latency_ms": per_row_ms,
                }
            )
    else:
        # Per-row path: needed for SHAP explain (single-row TreeExplainer)
        for idx in range(len(df)):
            row_df = df.iloc[[idx]]
            t0 = time.perf_counter()
            expl = engine.explain(row_df, top_k=top_k)
            pd_value = float(expl["probability_default"])
            latency_ms = (time.perf_counter() - t0) * 1000
            dec = decision_from_pd(
                pd_value, approve_pd_max=approve_pd_max, review_pd_max=review_pd_max
            )
            row_id = df.iloc[idx].get("ID") if "ID" in df.columns else None
            results.append(
                {
                    "row_index": idx,
                    "ID": row_id,
                    "probability_default": pd_value,
                    "recommendation": dec["recommendation"],
                    "risk_tier": dec["risk_tier"],
                    "explanation": expl,
                    "latency_ms": latency_ms,
                }
            )

    return results


def score_dataframe_with_policy(
    df: pd.DataFrame,
    db: Session,
    settings: Settings,
    *,
    explain: bool = True,
    top_k: int = 5,
) -> tuple[list[dict[str, Any]], Any]:
    policy = ensure_default_policy(db)
    ensure_model_version_row(db, settings)
    scored = score_dataframe(
        df,
        explain=explain,
        top_k=top_k,
        approve_pd_max=policy.approve_pd_max,
        review_pd_max=policy.review_pd_max,
    )
    return scored, policy

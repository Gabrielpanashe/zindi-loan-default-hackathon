"""Deterministic lending decision from PD and institution thresholds."""

from __future__ import annotations

from typing import Any, Literal

Recommendation = Literal["approve", "manual_review", "reject"]
RiskTier = Literal["low", "medium", "high"]


def decision_from_pd(
    pd_value: float,
    *,
    approve_pd_max: float = 0.30,
    review_pd_max: float = 0.60,
) -> dict[str, Any]:
    """
    approve: pd <= approve_pd_max
    manual_review: approve_pd_max < pd <= review_pd_max
    reject: pd > review_pd_max
    """
    if pd_value < 0 or pd_value > 1:
        raise ValueError("pd_value must be in [0, 1]")
    if not (0 <= approve_pd_max <= review_pd_max <= 1):
        raise ValueError("invalid policy bounds")

    if pd_value <= approve_pd_max:
        rec: Recommendation = "approve"
        tier: RiskTier = "low"
    elif pd_value <= review_pd_max:
        rec = "manual_review"
        tier = "medium"
    else:
        rec = "reject"
        tier = "high"

    return {
        "recommendation": rec,
        "risk_tier": tier,
        "policy_snapshot": {
            "approve_pd_max": approve_pd_max,
            "review_pd_max": review_pd_max,
        },
    }

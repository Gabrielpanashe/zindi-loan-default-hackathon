from app.services.decision import decision_from_pd


def test_decision_approve_boundary() -> None:
    d = decision_from_pd(0.30)
    assert d["recommendation"] == "approve"
    assert d["risk_tier"] == "low"


def test_decision_manual_mid() -> None:
    d = decision_from_pd(0.45)
    assert d["recommendation"] == "manual_review"
    assert d["risk_tier"] == "medium"


def test_decision_reject_high() -> None:
    d = decision_from_pd(0.61)
    assert d["recommendation"] == "reject"
    assert d["risk_tier"] == "high"

"""Map user-friendly application fields to Zindi raw row schema."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

SEGMENT_DEFAULTS: dict[str, dict[str, Any]] = {
    "farmer": {
        "employment_sector": "Agriculture",
        "loan_purpose": "Farming_Inputs",
        "product_code": 2,
    },
    "sme": {
        "employment_sector": "Trade",
        "loan_purpose": "Working_Capital",
        "product_code": 1,
    },
    "civil_servant": {
        "employment_sector": "Government",
        "loan_purpose": "Personal",
        "product_code": 3,
    },
    "informal_trader": {
        "employment_sector": "Informal_Sector",
        "loan_purpose": "Stock_Purchase",
        "product_code": 1,
    },
    "government_employee": {
        "employment_sector": "Government",
        "loan_purpose": "School_Fees",
        "product_code": 3,
    },
}


def _format_slash_date(dt: datetime) -> str:
    return dt.strftime("%d/%m/%Y")


def build_raw_payload(form: dict[str, Any]) -> dict[str, Any]:
    """
    Build a single raw borrower dict from a friendly form payload.
    Synthetic dates are derived from today + term for new applications.
    """
    segment = (form.get("applicant_segment") or "sme").lower().replace(" ", "_")
    defaults = SEGMENT_DEFAULTS.get(segment, SEGMENT_DEFAULTS["sme"])

    today = datetime.utcnow()
    term = int(form.get("term_months") or 12)
    approved = today
    disbursed = approved + timedelta(days=3)
    first_payment = disbursed + timedelta(days=30)
    maturity = approved + timedelta(days=term * 30)

    row: dict[str, Any] = {
        "ID": form.get("external_id") or f"APP-{today.strftime('%Y%m%d%H%M%S')}",
        "product_code": int(form.get("product_code") or defaults["product_code"]),
        "date_approved": form.get("date_approved") or _format_slash_date(approved),
        "date_disbursed": form.get("date_disbursed") or _format_slash_date(disbursed),
        "first_payment_due": form.get("first_payment_due") or _format_slash_date(first_payment),
        "maturity_date": form.get("maturity_date") or _format_slash_date(maturity),
        "amount_usd": float(form["amount_usd"]),
        "annual_rate_pct": float(form.get("annual_rate_pct") or 24.0),
        "term_months": term,
        "payment_frequency": form.get("payment_frequency") or "Monthly",
        "loan_purpose": form.get("loan_purpose") or defaults["loan_purpose"],
        "client_gender": form.get("client_gender") or "Male",
        "client_dob": form.get("client_dob"),
        "marital_status": form.get("marital_status") or "Single",
        "num_dependents": form.get("num_dependents"),
        "employment_sector": form.get("employment_sector") or defaults["employment_sector"],
        "months_at_employer": form.get("months_at_employer"),
        "monthly_income_usd": float(form["monthly_income_usd"]),
        "existing_obligations": int(form.get("existing_obligations") or 0),
        "collateral_type": form.get("collateral_type"),
        "disbursement_channel": form.get("disbursement_channel") or "Branch",
        "province": form.get("province") or "Harare",
    }
    return row


def apply_deltas(base: dict[str, Any], deltas: dict[str, Any]) -> dict[str, Any]:
    """Apply what-if deltas (absolute or relative keys like income_pct)."""
    out = dict(base)
    if "income_pct" in deltas and "monthly_income_usd" in out:
        out["monthly_income_usd"] = float(out["monthly_income_usd"]) * (1 + float(deltas["income_pct"]))
    if "amount_pct" in deltas and "amount_usd" in out:
        out["amount_usd"] = float(out["amount_usd"]) * (1 + float(deltas["amount_pct"]))
    for k, v in deltas.items():
        if k in ("income_pct", "amount_pct"):
            continue
        if v is not None:
            out[k] = v
    return out

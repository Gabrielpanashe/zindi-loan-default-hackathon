"""
Feature engineering — Zimbabwean loan default context.

All functions accept a DataFrame and return a new DataFrame with added columns.
Apply these BEFORE encoding/imputation (they use raw values).
"""

import pandas as pd
import numpy as np
from src.config import URBAN_PROVINCES, HIGH_RISK_PURPOSES, LOW_RISK_PURPOSES, LOW_RISK_SECTORS, HIGH_RISK_PROVINCES


# ── Date features ──────────────────────────────────────────────────────────────

def extract_date_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract features from date columns.
    NOTE: client_dob is 100% missing in this dataset — age feature is skipped.
    """
    df = df.copy()

    # Days between approval and disbursement — long lags may signal problem loans
    df["disburse_lag_days"] = (
        (df["date_disbursed"] - df["date_approved"]).dt.days
    )

    # Days between disbursement and first payment — short grace period = higher strain
    df["time_to_first_payment_days"] = (
        (df["first_payment_due"] - df["date_disbursed"]).dt.days
    )

    # Actual loan duration in days (cross-check against term_months)
    df["loan_duration_days"] = (
        (df["maturity_date"] - df["date_approved"]).dt.days
    )

    # Seasonality — Zimbabwe has agricultural cycles and school-fee spikes
    df["approval_month"]        = df["date_approved"].dt.month
    df["approval_quarter"]      = df["date_approved"].dt.quarter
    df["approval_dayofweek"]    = df["date_approved"].dt.dayofweek
    df["approval_is_month_end"] = (df["date_approved"].dt.day >= 25).astype(int)

    return df


# ── Financial ratio features ───────────────────────────────────────────────────

def build_ratio_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build credit-risk financial ratios from existing numeric columns.
    Uses small epsilon offsets to avoid division by zero.
    """
    df = df.copy()
    eps = 1e-6

    # Monthly repayment burden as share of income — THE primary affordability signal
    df["debt_to_income"] = (
        (df["amount_usd"] / (df["term_months"] + eps)) /
        (df["monthly_income_usd"] + eps)
    )

    # Total interest cost over the life of the loan
    df["total_interest_cost"] = (
        df["amount_usd"] * (df["annual_rate_pct"] / 100) * (df["term_months"] / 12)
    )

    # Can the borrower repay the full loan from their income over the term?
    df["loan_to_income_ratio"] = (
        df["amount_usd"] / (df["monthly_income_usd"] * df["term_months"] + eps)
    )

    # Disposable income per household member
    df["income_per_dependent"] = (
        df["monthly_income_usd"] / (df["num_dependents"] + 1)
    )

    # Existing debt load relative to income
    df["obligation_burden"] = (
        df["existing_obligations"] / (df["monthly_income_usd"] + eps)
    )

    # Average loan size if borrower has multiple active obligations (proxy)
    df["avg_loan_per_obligation"] = (
        df["amount_usd"] / (df["existing_obligations"] + 1)
    )

    # Combined rate-term stress: high rate * long term = expensive loan
    df["rate_x_term"] = df["annual_rate_pct"] * df["term_months"]

    return df


# ── Zimbabwe-specific context features ────────────────────────────────────────

def build_zimbabwe_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Binary and interaction features grounded in Zimbabwe's economic context.
    All thresholds confirmed by EDA (run_eda.py — May 11 2026).
    """
    df = df.copy()

    # ── Province risk (EDA confirmed: Matabeleland provinces highest risk) ──────
    # High-risk: above 24.12% national average
    HIGH_RISK_PROVINCES = [
        "Matabeleland_South",  # 28.60%
        "Matabeleland_North",  # 26.33%
        "Masvingo",            # 24.78%
        "Mashonaland_East",    # 24.69%
        "Mashonaland_West",    # 24.59%
    ]
    df["high_risk_province"] = df["province"].isin(HIGH_RISK_PROVINCES).astype(int)
    # Urban vs rural (Harare 23.24%, Bulawayo 23.91% — both below average = safer)
    df["urban_province"] = df["province"].isin(URBAN_PROVINCES).astype(int)

    # ── Employment sector (strongest predictor IV=0.15) ────────────────────────
    # Informal_Sector: 36.68%, Agriculture: 29.83% — both far above average
    df["informal_sector_flag"] = (
        df["employment_sector"] == "Informal_Sector"
    ).astype(int)
    df["agriculture_sector_flag"] = (
        df["employment_sector"] == "Agriculture"
    ).astype(int)
    # Low-risk sectors: Government 15.31%, Finance 13.82%, NGO 13.32%
    LOW_RISK_SECTORS = ["Government", "Finance", "NGO", "Telecom", "Mining"]
    df["low_risk_sector"] = df["employment_sector"].isin(LOW_RISK_SECTORS).astype(int)

    # ── Loan purpose risk (EDA confirmed actual rates) ─────────────────────────
    # High risk: Funeral 31%, Livestock 27%, Business_Expansion 26%, Working_Capital 26%
    # Low risk: School_Fees 17%, Debt_Consolidation 17%
    HIGH_RISK_PURPOSES = ["Funeral", "Livestock", "Business_Expansion",
                          "Working_Capital", "Stock_Purchase", "Farming_Inputs"]
    LOW_RISK_PURPOSES  = ["School_Fees", "Debt_Consolidation", "Medical", "Personal", "Rent"]
    df["high_risk_purpose"] = df["loan_purpose"].isin(HIGH_RISK_PURPOSES).astype(int)
    df["low_risk_purpose"]  = df["loan_purpose"].isin(LOW_RISK_PURPOSES).astype(int)

    # ── Product code risk (EDA confirmed) ─────────────────────────────────────
    # Emergency (5): 39.89% — far highest risk
    # Salary_Based (3): 13.00% — far lowest risk (deducted from salary)
    df["emergency_loan"]    = (df["product_code"] == 5).astype(int)
    df["salary_backed_loan"] = (df["product_code"] == 3).astype(int)

    # ── MFI vs bank loan rate split ────────────────────────────────────────────
    # EDA: WoE turns positive above ~80.83%. Below 17.6% is clearly bank (WoE negative).
    # Split at 80% confirmed by histogram valley and WoE table.
    df["high_rate_mfi_loan"] = (df["annual_rate_pct"] > 80).astype(int)
    df["bank_rate_loan"]     = (df["annual_rate_pct"] < 18).astype(int)

    # ── Collateral (EDA: missing=30.11% default, Property=17.36% default) ─────
    df["has_collateral"]    = (
        df["collateral_type"].notna() & (df["collateral_type"] != "None")
    ).astype(int)
    df["strong_collateral"] = df["collateral_type"].isin(["Property", "Vehicle"]).astype(int)
    # Guarantor has WoE=-0.11 — slightly protective but weakest formal collateral
    df["guarantor_only"]    = (df["collateral_type"] == "Guarantor").astype(int)

    # ── Agricultural context ───────────────────────────────────────────────────
    agri_provinces = [
        "Mashonaland_Central", "Mashonaland_East",
        "Manicaland", "Masvingo", "Mashonaland_West",
    ]
    df["agri_loan_in_agri_province"] = (
        (df["product_code"] == 2) & df["province"].isin(agri_provinces)
    ).astype(int)

    return df


# ── Interaction features ───────────────────────────────────────────────────────

def build_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    String and numeric interactions between features.
    """
    df = df.copy()

    # Geographic × economic sector interaction
    df["province_x_sector"] = (
        df["province"].astype(str) + "_" + df["employment_sector"].astype(str)
    )

    # Loan product × purpose alignment
    df["product_x_purpose"] = (
        df["product_code"].astype(str) + "_" + df["loan_purpose"].astype(str)
    )

    # High rate AND multiple obligations → double financial stress signal
    df["rate_x_obligations"] = df["annual_rate_pct"] * df["existing_obligations"]

    return df


# ── Missing-value indicator flags ─────────────────────────────────────────────

def add_missing_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Binary flags for informative missingness.
    Collateral missing (31.8%) is the most important — no collateral = higher risk.
    """
    df = df.copy()
    flagged_cols = [
        "collateral_type",
        "monthly_income_usd",
        "num_dependents",
        "months_at_employer",
        "annual_rate_pct",
        "employment_sector",
        "loan_purpose",
        "marital_status",
    ]
    for col in flagged_cols:
        if col in df.columns:
            df[f"{col}_missing"] = df[col].isna().astype(int)
    return df


# ── Master pipeline ────────────────────────────────────────────────────────────

def engineer_all_features(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all feature engineering steps in order."""
    df = extract_date_features(df)
    df = build_ratio_features(df)
    df = build_zimbabwe_features(df)
    df = build_interaction_features(df)
    df = add_missing_flags(df)
    return df

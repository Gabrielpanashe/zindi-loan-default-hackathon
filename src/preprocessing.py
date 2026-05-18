"""
Preprocessing pipeline — missing value imputation and categorical encoding.

Strategy:
  - Categorical NaNs → filled with "Unknown" (informative missingness preserved via flags)
  - Numeric NaNs    → IterativeImputer (for LogReg) OR left as NaN (for tree models)
  - annual_rate_pct → imputed within product_code groups (bimodal distribution)
  - Encoding        → TargetEncoder for high-cardinality cats, OrdinalEncoder for low
"""

import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer, KNNImputer
from sklearn.preprocessing import OrdinalEncoder
import category_encoders as ce

from src.config import (
    DATA_PROC, TRAIN_FEATS, TEST_FEATS,
    HIGH_CARD_CATS, LOW_CARD_CATS, NUM_COLS,
    TARGET_COL, ID_COL, RANDOM_SEED,
)
from src.feature_engineering import engineer_all_features


# ── Categorical imputation ─────────────────────────────────────────────────────

CAT_FILL_UNKNOWN = [
    "collateral_type", "employment_sector",
    "loan_purpose", "marital_status",
]


def impute_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in CAT_FILL_UNKNOWN:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown")
    return df


def impute_annual_rate(df: pd.DataFrame) -> pd.DataFrame:
    """Impute annual_rate_pct within product_code groups (bimodal distribution)."""
    df = df.copy()
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median())
    )
    # Fallback for any remaining NaN (e.g. product_code with all-NaN rate)
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())
    return df


# ── Numeric imputation ─────────────────────────────────────────────────────────

NUMERIC_IMPUTE_COLS = ["monthly_income_usd", "num_dependents", "months_at_employer"]


def fit_iterative_imputer(train: pd.DataFrame) -> IterativeImputer:
    imputer = IterativeImputer(max_iter=10, random_state=RANDOM_SEED)
    imputer.fit(train[NUMERIC_IMPUTE_COLS])
    return imputer


def apply_iterative_imputer(
    df: pd.DataFrame, imputer: IterativeImputer
) -> pd.DataFrame:
    df = df.copy()
    df[NUMERIC_IMPUTE_COLS] = imputer.transform(df[NUMERIC_IMPUTE_COLS])
    return df


# ── Categorical encoding ───────────────────────────────────────────────────────

def fit_target_encoder(
    train: pd.DataFrame, target: pd.Series
) -> ce.TargetEncoder:
    encoder = ce.TargetEncoder(cols=HIGH_CARD_CATS, smoothing=1.0)
    encoder.fit(train[HIGH_CARD_CATS], target)
    return encoder


def fit_ordinal_encoder(train: pd.DataFrame) -> OrdinalEncoder:
    encoder = OrdinalEncoder(
        handle_unknown="use_encoded_value", unknown_value=-1
    )
    encoder.fit(train[LOW_CARD_CATS].astype(str))
    return encoder


def apply_encoders(
    df: pd.DataFrame,
    target_enc: ce.TargetEncoder,
    ordinal_enc: OrdinalEncoder,
) -> pd.DataFrame:
    df = df.copy()
    df[HIGH_CARD_CATS] = target_enc.transform(df[HIGH_CARD_CATS])
    df[LOW_CARD_CATS]  = ordinal_enc.transform(df[LOW_CARD_CATS].astype(str))
    return df


# ── Drop date and ID columns (after feature engineering extracts from them) ────

DATE_COLS = [
    "date_approved", "date_disbursed",
    "first_payment_due", "maturity_date", "client_dob",
]


def drop_raw_dates(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(columns=[c for c in DATE_COLS if c in df.columns], errors="ignore")


# ── Master fit-transform ───────────────────────────────────────────────────────

def fit_transform_save(
    train: pd.DataFrame,
    test: pd.DataFrame,
    impute_numeric: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Full pipeline: feature engineering → imputation → encoding → save parquets.
    Fits on train only, then applies to both train and test.

    Parameters
    ----------
    train          : raw training DataFrame (output of data_loader.load_train())
    test           : raw test DataFrame (output of data_loader.load_test())
    impute_numeric : if True, use IterativeImputer on numeric cols (needed for LogReg)
                     if False, keep NaN (for tree models that handle NaN natively)
    """
    target = train[TARGET_COL].copy()
    train_ids = train[ID_COL].copy()
    test_ids  = test[ID_COL].copy()

    # Step 1: Feature engineering (adds new columns, does not remove originals yet)
    train = engineer_all_features(train)
    test  = engineer_all_features(test)

    # Step 2: Categorical imputation (fill NaN with "Unknown")
    train = impute_categoricals(train)
    test  = impute_categoricals(test)

    # Step 3: annual_rate_pct — group-wise imputation
    train = impute_annual_rate(train)
    test  = impute_annual_rate(test)

    # Step 4: Numeric imputation (fit on train only)
    if impute_numeric:
        imputer = fit_iterative_imputer(train)
        train   = apply_iterative_imputer(train, imputer)
        test    = apply_iterative_imputer(test, imputer)
        _save(imputer, DATA_PROC / "iterative_imputer.pkl")

    # Step 5: Categorical encoding (fit on train only)
    target_enc  = fit_target_encoder(train, target)
    ordinal_enc = fit_ordinal_encoder(train)
    train = apply_encoders(train, target_enc, ordinal_enc)
    test  = apply_encoders(test,  target_enc, ordinal_enc)
    _save(target_enc,  DATA_PROC / "target_encoder.pkl")
    _save(ordinal_enc, DATA_PROC / "ordinal_encoder.pkl")

    # Step 6: Drop raw date columns (features already extracted)
    train = drop_raw_dates(train)
    test  = drop_raw_dates(test)

    # Step 6b: Final NaN cleanup — ratio/interaction features inherit NaN from base cols.
    # Fill remaining numeric NaN with column median (from train).
    # Fill remaining object NaN with "Unknown".
    num_medians = train.select_dtypes(include="number").median()
    train = train.fillna(num_medians)
    test  = test.fillna(num_medians)   # use train medians on test — no leakage
    for col in train.select_dtypes(include="object").columns:
        train[col] = train[col].fillna("Unknown")
        test[col]  = test[col].fillna("Unknown")

    # Step 7: Restore ID and target, save
    train[ID_COL]     = train_ids
    train[TARGET_COL] = target
    test[ID_COL]      = test_ids

    DATA_PROC.mkdir(parents=True, exist_ok=True)
    train.to_parquet(TRAIN_FEATS, index=False)
    test.to_parquet(TEST_FEATS,   index=False)
    print(f"Saved: {TRAIN_FEATS}  shape={train.shape}")
    print(f"Saved: {TEST_FEATS}   shape={test.shape}")

    return train, test


def _save(obj, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump(obj, f)


def load_processed() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load already-processed train and test parquets."""
    train = pd.read_parquet(TRAIN_FEATS)
    test  = pd.read_parquet(TEST_FEATS)
    return train, test


def load_inference_artifacts() -> tuple[
    IterativeImputer | None,
    ce.TargetEncoder,
    OrdinalEncoder,
]:
    """Load pickles written by fit_transform_save (impute_numeric=True)."""
    imputer_path = DATA_PROC / "iterative_imputer.pkl"
    if not imputer_path.exists():
        raise FileNotFoundError(
            f"Missing {imputer_path}. Run fit_transform_save() with impute_numeric=True."
        )
    with open(imputer_path, "rb") as f:
        imputer = pickle.load(f)
    with open(DATA_PROC / "target_encoder.pkl", "rb") as f:
        target_enc = pickle.load(f)
    with open(DATA_PROC / "ordinal_encoder.pkl", "rb") as f:
        ordinal_enc = pickle.load(f)
    return imputer, target_enc, ordinal_enc


_DATE_COLS_SLASH = ["date_approved", "date_disbursed", "first_payment_due", "maturity_date"]


def _ensure_datetime(df: pd.DataFrame) -> pd.DataFrame:
    """Parse date columns from strings to datetime if they are not already."""
    df = df.copy()
    for col in _DATE_COLS_SLASH:
        if col in df.columns and not pd.api.types.is_datetime64_any_dtype(df[col]):
            parsed = pd.to_datetime(df[col], format="%d/%m/%Y", errors="coerce")
            if parsed.isna().all():
                parsed = pd.to_datetime(df[col], errors="coerce")
            df[col] = parsed
    return df


def transform_raw_features(
    df: pd.DataFrame,
    *,
    imputer: IterativeImputer | None,
    target_enc: ce.TargetEncoder,
    ordinal_enc: OrdinalEncoder,
    num_medians: pd.Series,
    impute_numeric: bool = True,
) -> pd.DataFrame:
    """
    Apply the same transform as fit_transform_save (without fitting or saving).

    Parameters
    ----------
    df : raw borrower row(s), same schema as load_train()/load_test() (minus Target optional).
    num_medians : numeric column medians from training (after step 6, before label-encoding strings).
    """
    df = df.copy()
    df = _ensure_datetime(df)
    df = engineer_all_features(df)
    df = impute_categoricals(df)
    df = impute_annual_rate(df)
    if impute_numeric:
        if imputer is None:
            raise ValueError("imputer is required when impute_numeric=True")
        df = apply_iterative_imputer(df, imputer)
    df = apply_encoders(df, target_enc, ordinal_enc)
    df = drop_raw_dates(df)

    med = num_medians.reindex(df.columns)
    df = df.fillna(med)
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].fillna("Unknown")
    return df

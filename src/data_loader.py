import pandas as pd
from src.config import TRAIN_CSV, TEST_CSV, SAMPLE_SUB, ID_COL, TARGET_COL

# Date formats present in the dataset:
#   date_approved, date_disbursed, first_payment_due, maturity_date → DD/M/YYYY
#   client_dob → DD-Mon-YYYY  (e.g. "15-Jan-1985")
_SLASH_DATE_COLS = ["date_approved", "date_disbursed", "first_payment_due", "maturity_date"]
_DOB_COL = "client_dob"


def _parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    # Train uses DD/M/YYYY, Test uses YYYY-MM-DD.
    # Try strict format first; fall back to pandas auto-inference if majority fail.
    for col in _SLASH_DATE_COLS:
        if col in df.columns:
            parsed = pd.to_datetime(df[col], format="%d/%m/%Y", errors="coerce")
            if parsed.isna().mean() > 0.5:
                parsed = pd.to_datetime(df[col], errors="coerce")
            df[col] = parsed
    if _DOB_COL in df.columns:
        df[_DOB_COL] = pd.to_datetime(df[_DOB_COL], format="%d-%b-%Y", errors="coerce")
    return df


def load_train() -> pd.DataFrame:
    df = pd.read_csv(TRAIN_CSV)
    df = _parse_dates(df)
    return df


def load_test() -> pd.DataFrame:
    df = pd.read_csv(TEST_CSV)
    df = _parse_dates(df)
    return df


def load_sample_submission() -> pd.DataFrame:
    return pd.read_csv(SAMPLE_SUB)


def load_all():
    """Returns (train, test, sample_submission) as a tuple."""
    return load_train(), load_test(), load_sample_submission()

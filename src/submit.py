"""
Submission utilities — generate and validate Zindi submission files.
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

from src.config import SUBMISSIONS, SAMPLE_SUB, ID_COL, TARGET_COL


def make_submission(
    test_ids: pd.Series | np.ndarray,
    predictions: np.ndarray,
    path: str | Path | None = None,
    label: str = "submission",
) -> pd.DataFrame:
    """
    Build and save a submission CSV.

    Parameters
    ----------
    test_ids    : ID column from the test set (12,977 rows)
    predictions : predicted default probabilities (float, 0–1)
    path        : output path; auto-generated with timestamp if None
    label       : short name embedded in auto-generated filename

    Returns
    -------
    submission DataFrame
    """
    sub = pd.DataFrame({ID_COL: test_ids, TARGET_COL: predictions})

    if path is None:
        SUBMISSIONS.mkdir(parents=True, exist_ok=True)
        ts   = datetime.now().strftime("%Y%m%d_%H%M")
        path = SUBMISSIONS / f"{label}_{ts}.csv"

    sub.to_csv(path, index=False)
    print(f"Submission saved -> {path}  ({len(sub):,} rows)")
    return sub


def validate_submission(
    path: str | Path,
    sample_sub_path: str | Path = SAMPLE_SUB,
    raise_on_error: bool = True,
) -> bool:
    """
    Validate a submission file against the sample submission format.

    Checks:
      1. Correct column names: [ID, Target]
      2. Correct number of rows: 12,977
      3. No NaN values
      4. Target is numeric and in [0, 1]
      5. All IDs in sample submission are present

    Returns True if valid, raises ValueError if raise_on_error=True.
    """
    errors = []

    sub    = pd.read_csv(path)
    sample = pd.read_csv(sample_sub_path)

    # Column check
    expected_cols = [ID_COL, TARGET_COL]
    if list(sub.columns) != expected_cols:
        errors.append(f"Columns must be {expected_cols}, got {list(sub.columns)}")

    # Row count check
    if len(sub) != len(sample):
        errors.append(f"Expected {len(sample):,} rows, got {len(sub):,}")

    # NaN check
    if sub.isna().any().any():
        errors.append("Submission contains NaN values")

    # Target range check
    if TARGET_COL in sub.columns:
        target_vals = pd.to_numeric(sub[TARGET_COL], errors="coerce")
        if target_vals.isna().any():
            errors.append("Target column contains non-numeric values")
        elif not target_vals.between(0, 1).all():
            errors.append("Target values must be in [0, 1]")

    # ID completeness check
    if ID_COL in sub.columns and ID_COL in sample.columns:
        missing_ids = set(sample[ID_COL]) - set(sub[ID_COL])
        if missing_ids:
            errors.append(f"{len(missing_ids)} IDs from sample submission are missing")

    if errors:
        msg = "Submission validation FAILED:\n" + "\n".join(f"  - {e}" for e in errors)
        if raise_on_error:
            raise ValueError(msg)
        print(msg)
        return False

    print(f"Submission VALID — {len(sub):,} rows, Target range: "
          f"[{sub[TARGET_COL].min():.4f}, {sub[TARGET_COL].max():.4f}]")
    return True


# Allow running as a script: python src/submit.py submissions/my_file.csv
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python src/submit.py <submission_file.csv>")
        sys.exit(1)
    validate_submission(sys.argv[1])

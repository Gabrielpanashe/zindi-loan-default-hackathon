"""
Submission format validator — run before every Zindi upload.

Usage:
    python tests/test_submission_format.py submissions/my_file.csv

Checks:
    1. Correct columns: [ID, Target]
    2. Exactly 12,977 rows
    3. No NaN values
    4. Target is numeric and in [0.0, 1.0]
    5. All test IDs present (compared against SampleSubmission.csv)
"""

import sys
import pathlib
import pandas as pd

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from src.config import SAMPLE_SUB, ID_COL, TARGET_COL

EXPECTED_ROWS = 12_977


def validate(sub_path: str) -> bool:
    errors = []
    sub = pd.read_csv(sub_path)

    # 1. Column names
    expected = [ID_COL, TARGET_COL]
    if list(sub.columns) != expected:
        errors.append(f"Columns must be {expected}, got {list(sub.columns)}")

    # 2. Row count
    if len(sub) != EXPECTED_ROWS:
        errors.append(f"Expected {EXPECTED_ROWS:,} rows, got {len(sub):,}")

    # 3. No NaN
    if sub.isna().any().any():
        n = sub.isna().sum().sum()
        errors.append(f"Found {n} NaN values — all cells must be filled")

    # 4. Target range
    if TARGET_COL in sub.columns:
        tgt = pd.to_numeric(sub[TARGET_COL], errors="coerce")
        if tgt.isna().any():
            errors.append("Target column contains non-numeric values")
        elif not tgt.between(0.0, 1.0).all():
            out = sub[~tgt.between(0.0, 1.0)]
            errors.append(
                f"Target must be in [0, 1]. "
                f"Found {len(out)} values outside range "
                f"(min={tgt.min():.4f}, max={tgt.max():.4f})"
            )

    # 5. ID completeness
    if SAMPLE_SUB.exists() and ID_COL in sub.columns:
        sample = pd.read_csv(SAMPLE_SUB)
        missing = set(sample[ID_COL]) - set(sub[ID_COL])
        extra   = set(sub[ID_COL]) - set(sample[ID_COL])
        if missing:
            errors.append(f"{len(missing)} IDs missing from submission")
        if extra:
            errors.append(f"{len(extra)} unexpected IDs found in submission")
    else:
        print("  [WARN] SampleSubmission.csv not found — skipping ID check")

    if errors:
        print(f"\nFAILED: {sub_path}")
        for e in errors:
            print(f"  - {e}")
        return False

    print(f"\nPASSED: {sub_path}")
    print(f"  Rows: {len(sub):,}")
    print(f"  Target range: [{sub[TARGET_COL].min():.4f}, {sub[TARGET_COL].max():.4f}]")
    print(f"  Mean predicted probability: {sub[TARGET_COL].mean():.4f}")
    return True


def test_submission_valid(tmp_path, sample_sub_path=None):
    """pytest-compatible test — called with a known-good fixture."""
    import numpy as np
    sample = pd.read_csv(sample_sub_path or SAMPLE_SUB)
    good_sub = tmp_path / "good.csv"
    good_sub.write_text(
        sample[[ID_COL]].assign(**{TARGET_COL: np.random.uniform(0, 1, len(sample))}).to_csv(index=False)
    )
    assert validate(str(good_sub)) is True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tests/test_submission_format.py <submission_file.csv>")
        sys.exit(1)
    ok = validate(sys.argv[1])
    sys.exit(0 if ok else 1)

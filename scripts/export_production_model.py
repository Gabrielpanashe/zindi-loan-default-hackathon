"""
Export a production LightGBM classifier + manifest for the Loan Risk platform.

Prerequisites (run from repo root with PYTHONPATH=repo or `python scripts/...`):
  1. Raw CSVs in data/raw/
  2. Processed parquets + encoder pickles from src.preprocessing.fit_transform_save(...)
"""

from __future__ import annotations

import argparse
import json
import pickle
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from src.config import ID_COL, TARGET_COL
from src.models import get_lgbm
from src.preprocessing import load_processed
from src.train import train_full


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="v1", help="Artifact subfolder under risk_platform/artifacts/")
    ap.add_argument("--out", default=None, help="Output directory (default risk_platform/artifacts/<version>)")
    args = ap.parse_args()

    out_dir = Path(args.out) if args.out else ROOT / "risk_platform" / "artifacts" / args.version
    out_dir.mkdir(parents=True, exist_ok=True)

    train_proc, test_proc = load_processed()
    FEATURE_COLS = [c for c in train_proc.columns if c not in [TARGET_COL, ID_COL]]

    train_feats = train_proc[FEATURE_COLS].copy()
    test_feats = test_proc[FEATURE_COLS].copy()

    obj_cols = train_feats.select_dtypes(include="object").columns.tolist()
    label_encoders: dict[str, LabelEncoder] = {}
    if obj_cols:
        print("Fitting LabelEncoders (train only):", obj_cols)
        for col in obj_cols:
            le = LabelEncoder()
            le.fit(train_feats[col].astype(str))
            label_encoders[col] = le

    X = train_feats.copy()
    for col, le in label_encoders.items():
        unk = len(le.classes_)
        s = X[col].astype(str)
        known_mask = s.isin(le.classes_).to_numpy()
        result = np.full(len(s), unk, dtype=np.float32)
        if known_mask.any():
            result[known_mask] = le.transform(s[known_mask]).astype(np.float32)
        X[col] = result
    X = X.astype("float32").to_numpy()

    y = train_proc[TARGET_COL].values
    print(f"Training LightGBM on full data: X={X.shape}, positives={y.sum()}")
    model = train_full(get_lgbm(), X, y)
    joblib.dump(model, out_dir / "classifier.joblib")

    num_medians = train_proc.select_dtypes(include="number").median()
    with open(out_dir / "numeric_medians.pkl", "wb") as f:
        pickle.dump(num_medians, f)

    with open(out_dir / "label_encoders.pkl", "wb") as f:
        pickle.dump(label_encoders, f)

    git_sha = ""
    try:
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    manifest = {
        "model_version": args.version,
        "algorithm": "LightGBM",
        "feature_cols": FEATURE_COLS,
        "n_features": len(FEATURE_COLS),
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "git_sha": git_sha,
    }
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote artifacts to {out_dir}")
    print("  classifier.joblib, manifest.json, numeric_medians.pkl, label_encoders.pkl")


if __name__ == "__main__":
    main()

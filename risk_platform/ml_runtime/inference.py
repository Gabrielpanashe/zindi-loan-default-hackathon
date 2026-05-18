"""
Load exported artifacts and score raw borrower rows (Zindi schema) with SHAP.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.preprocessing import LabelEncoder

from src.config import ID_COL, TARGET_COL
from src.preprocessing import load_inference_artifacts, transform_raw_features


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _apply_label_encoders(
    df: pd.DataFrame,
    encoders: dict[str, LabelEncoder],
) -> pd.DataFrame:
    out = df.copy()
    for col, le in encoders.items():
        if col not in out.columns:
            continue
        s = out[col].astype(str)
        unk = len(le.classes_)
        known_mask = s.isin(le.classes_)
        result = np.full(len(s), unk, dtype=np.int32)
        if known_mask.any():
            result[known_mask.to_numpy()] = le.transform(s[known_mask]).astype(np.int32)
        out[col] = result
    return out


class InferenceEngine:
    """Loads classifier + preprocessing; produces PD, SHAP, and narrative drivers."""

    def __init__(self, artifacts_dir: Path | None = None) -> None:
        root = _repo_root()
        self.artifacts_dir = Path(artifacts_dir or root / "risk_platform" / "artifacts" / "v1")
        manifest_path = self.artifacts_dir / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(
                f"Missing {manifest_path}. Run: python scripts/export_production_model.py"
            )
        with open(manifest_path, encoding="utf-8") as f:
            self.manifest: dict[str, Any] = json.load(f)
        self.feature_cols: list[str] = self.manifest["feature_cols"]
        self.model = joblib.load(self.artifacts_dir / "classifier.joblib")
        with open(self.artifacts_dir / "numeric_medians.pkl", "rb") as f:
            self.num_medians: pd.Series = pickle.load(f)
        le_path = self.artifacts_dir / "label_encoders.pkl"
        self.label_encoders: dict[str, LabelEncoder] = {}
        if le_path.exists():
            with open(le_path, "rb") as f:
                self.label_encoders = pickle.load(f)
        self._imputer, self._target_enc, self._ordinal_enc = load_inference_artifacts()
        self._explainer = shap.TreeExplainer(self.model)

    def transform(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        """Raw Zindi-style rows → processed feature frame (includes ID if present)."""
        proc = transform_raw_features(
            raw_df,
            imputer=self._imputer,
            target_enc=self._target_enc,
            ordinal_enc=self._ordinal_enc,
            num_medians=self.num_medians,
            impute_numeric=True,
        )
        proc = _apply_label_encoders(proc, self.label_encoders)
        return proc

    def feature_matrix(self, proc: pd.DataFrame) -> np.ndarray:
        X = proc[self.feature_cols].astype(np.float32).to_numpy()
        return X

    def predict_proba(self, raw_df: pd.DataFrame) -> np.ndarray:
        proc = self.transform(raw_df)
        X = self.feature_matrix(proc)
        return self.model.predict_proba(X)[:, 1]

    def explain(
        self,
        raw_df: pd.DataFrame,
        top_k: int = 8,
    ) -> dict[str, Any]:
        proc = self.transform(raw_df)
        X = self.feature_matrix(proc)
        shap_values = self._explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        sv = np.asarray(shap_values)
        if sv.ndim == 2:
            sv = sv[0]
        else:
            sv = sv.reshape(X.shape[0], -1)[0]
        ev = self._explainer.expected_value
        if isinstance(ev, np.ndarray):
            base = float(ev.ravel()[-1])
        else:
            base = float(ev)

        order = np.argsort(-np.abs(sv))
        top_idx = order[:top_k]
        contributions = []
        for i in top_idx:
            name = self.feature_cols[int(i)]
            val = float(sv[int(i)])
            contributions.append(
                {
                    "feature": name,
                    "shap_value": val,
                    "direction": "increases_risk" if val > 0 else "decreases_risk",
                }
            )
        narratives = _narrate(contributions)
        return {
            "expected_value": base,
            "probability_default": float(self.model.predict_proba(X)[0, 1]),
            "top_contributions": contributions,
            "narratives": narratives,
            "shap_values": {self.feature_cols[j]: float(sv[j]) for j in range(len(sv))},
        }


def _narrate(contributions: list[dict[str, Any]]) -> list[str]:
    """Lightweight human-readable lines from SHAP-signed contributions."""
    lines: list[str] = []
    for c in contributions[:5]:
        f = c["feature"]
        direction = c["direction"]
        if direction == "increases_risk":
            lines.append(f"{_pretty_name(f)} pushed the default estimate higher.")
        else:
            lines.append(f"{_pretty_name(f)} pulled the default estimate lower.")
    return lines


def _pretty_name(feature: str) -> str:
    return feature.replace("_", " ")

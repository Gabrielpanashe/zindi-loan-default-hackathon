"""
V3 — Ensemble: LightGBM (v1) + CatBoost (v2).
No retraining — just combines saved predictions.
Tests simple average and weighted average (by OOF AUC).
"""
import sys, pathlib, warnings
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from src.preprocessing import load_processed
from src.config import TARGET_COL, ID_COL
from src.submit import make_submission, validate_submission

# ── Load OOF and test predictions ─────────────────────────────────────────────
print("Loading saved predictions...")
lgbm_oof  = np.load("models/lgbm_oof.npy")
cb_oof    = np.load("models/v2_catboost_oof.npy")
lgbm_test = np.load("models/lgbm_test.npy")
cb_test   = np.load("models/v2_catboost_test.npy")

_, test_proc = load_processed()
train_proc, _ = load_processed()
y = train_proc[TARGET_COL].values

lgbm_auc = roc_auc_score(y, lgbm_oof)
cb_auc   = roc_auc_score(y, cb_oof)

print(f"\nIndividual OOF AUCs:")
print(f"  LightGBM:  {lgbm_auc:.5f}")
print(f"  CatBoost:  {cb_auc:.5f}")

# ── Option A: Simple average ───────────────────────────────────────────────────
simple_oof  = (lgbm_oof + cb_oof) / 2
simple_test = (lgbm_test + cb_test) / 2
simple_auc  = roc_auc_score(y, simple_oof)
print(f"\nSimple average OOF AUC:   {simple_auc:.5f}")

# ── Option B: Weighted average (by OOF AUC) ───────────────────────────────────
total = lgbm_auc + cb_auc
w_lgbm, w_cb = lgbm_auc / total, cb_auc / total
wtd_oof  = w_lgbm * lgbm_oof  + w_cb * cb_oof
wtd_test = w_lgbm * lgbm_test + w_cb * cb_test
wtd_auc  = roc_auc_score(y, wtd_oof)
print(f"Weighted average OOF AUC: {wtd_auc:.5f}  "
      f"(w_lgbm={w_lgbm:.3f}, w_cb={w_cb:.3f})")

# ── Pick the best ──────────────────────────────────────────────────────────────
if wtd_auc >= simple_auc:
    best_test, best_auc, best_name = wtd_test, wtd_auc, "weighted_avg"
else:
    best_test, best_auc, best_name = simple_test, simple_auc, "simple_avg"

print(f"\nBest ensemble: {best_name}  OOF AUC={best_auc:.5f}")
np.save("models/v3_ensemble_oof.npy",  wtd_oof)
np.save("models/v3_ensemble_test.npy", best_test)

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/v3_ensemble_{best_name}_oofAUC{best_auc:.4f}.csv"
make_submission(test_proc[ID_COL], best_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"VERSION LOG")
print(f"  V1  LightGBM default:         OOF={lgbm_auc:.5f}  Zindi=0.???")
print(f"  V2  CatBoost native cats:      OOF={cb_auc:.5f}  Zindi=0.671944")
print(f"  V3  Ensemble ({best_name}): OOF={best_auc:.5f}  Zindi=???")
print(f"\nGain over V2: {best_auc - cb_auc:+.5f}")
print(f"\nV3 file: {pathlib.Path(sub_path).name}")
print("="*60)

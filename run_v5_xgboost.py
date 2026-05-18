"""
V5 — XGBoost with tuned parameters on the processed features.
XGBoost uses histogram-based splits and handles missing values differently
from CatBoost — making it a genuinely diverse model for ensembling.
"""
import sys, pathlib, warnings, time, copy
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_auc_score

from src.preprocessing import load_processed
from src.train import load_folds, cross_validate_model, train_full
from src.config import TARGET_COL, ID_COL, RANDOM_SEED, SCALE_POS_WEIGHT
from src.submit import make_submission, validate_submission

# ── Load processed features ───────────────────────────────────────────────────
print("Loading processed data...")
train_proc, test_proc = load_processed()
folds = load_folds()

FEATURE_COLS = [c for c in train_proc.columns if c not in [TARGET_COL, ID_COL]]
y = train_proc[TARGET_COL].values

train_feats = train_proc[FEATURE_COLS].copy()
test_feats  = test_proc[FEATURE_COLS].copy()

# XGBoost requires all-numeric — label encode string columns
for col in train_feats.select_dtypes(include="object").columns:
    le = LabelEncoder()
    combined = pd.concat([train_feats[col], test_feats[col]], axis=0).astype(str)
    le.fit(combined)
    train_feats[col] = le.transform(train_feats[col].astype(str))
    test_feats[col]  = le.transform(test_feats[col].astype(str))

X      = train_feats.values.astype(np.float32)
X_test = test_feats.values.astype(np.float32)
print(f"Features: {X.shape[1]}  |  Train: {X.shape[0]}  |  Test: {X_test.shape[0]}")

# ── XGBoost model — parameters chosen to complement CatBoost ─────────────────
# CatBoost: depth=5, heavy l2 regularization, ordered boosting
# XGBoost: deeper trees, min_child_weight for leaf size control, subsample
xgb_model = XGBClassifier(
    objective          = "binary:logistic",
    eval_metric        = "auc",
    n_estimators       = 3000,
    learning_rate      = 0.02,
    max_depth          = 7,          # deeper than CatBoost's depth=5
    min_child_weight   = 20,         # min samples per leaf
    subsample          = 0.75,
    colsample_bytree   = 0.70,
    colsample_bylevel  = 0.70,
    reg_alpha          = 0.1,
    reg_lambda         = 5.0,
    scale_pos_weight   = SCALE_POS_WEIGHT,   # handles 3.15:1 class imbalance
    tree_method        = "hist",     # fast on CPU
    early_stopping_rounds = 150,
    n_jobs             = -1,
    random_state       = RANDOM_SEED,
    verbosity          = 0,
)

# ── 5-fold CV ──────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("V5: XGBoost — 5-fold CV")
print("="*60)
t0 = time.time()
cv = cross_validate_model(xgb_model, X, y, folds, use_smote=False,
                          early_stopping_rounds=150)
print(f"\nXGBoost done in {time.time()-t0:.0f}s")
np.save("models/v5_xgb_oof.npy", cv["oof_preds"])

# ── Full retrain ───────────────────────────────────────────────────────────────
print("\nTraining on full dataset...")
xgb_full = copy.deepcopy(xgb_model)
xgb_full.set_params(early_stopping_rounds=None, n_estimators=3000)
xgb_full.fit(X, y, verbose=False)
xgb_test = xgb_full.predict_proba(X_test)[:, 1]
np.save("models/v5_xgb_test.npy", xgb_test)

# Feature importance
feat_imp = pd.DataFrame({
    "feature":    FEATURE_COLS,
    "importance": xgb_full.feature_importances_,
}).sort_values("importance", ascending=False)
print("\nTop 20 features (XGBoost):")
print(feat_imp.head(20).to_string(index=False))

# ── V5 Submission ──────────────────────────────────────────────────────────────
sub_path = f"submissions/v5_xgboost_oofAUC{cv['oof_auc']:.4f}.csv"
make_submission(test_proc[ID_COL], xgb_test, path=sub_path)
validate_submission(sub_path)

# ── V6 Ensemble: XGBoost + CatBoost Optuna ────────────────────────────────────
print("\n" + "="*60)
print("V6: Ensemble — XGBoost (V5) + CatBoost Optuna (V4)")
print("="*60)
cb_oof  = np.load("models/v4_catboost_oof.npy")
cb_test = np.load("models/v4_catboost_test.npy")
xgb_oof = cv["oof_preds"]

cb_auc  = roc_auc_score(y, cb_oof)
xgb_auc = cv["oof_auc"]

# Weighted by OOF AUC
total = cb_auc + xgb_auc
w_cb, w_xgb = cb_auc / total, xgb_auc / total
ens_oof  = w_cb * cb_oof  + w_xgb * xgb_oof
ens_test = w_cb * cb_test + w_xgb * xgb_test
ens_auc  = roc_auc_score(y, ens_oof)

# Also try simple average
avg_oof  = (cb_oof + xgb_oof) / 2
avg_test = (cb_test + xgb_test) / 2
avg_auc  = roc_auc_score(y, avg_oof)

print(f"  CatBoost OOF AUC: {cb_auc:.5f}  (weight={w_cb:.3f})")
print(f"  XGBoost  OOF AUC: {xgb_auc:.5f}  (weight={w_xgb:.3f})")
print(f"  Simple average:   {avg_auc:.5f}")
print(f"  Weighted average: {ens_auc:.5f}")

# Pick best
if ens_auc >= avg_auc:
    best_test, best_auc, best_name = ens_test, ens_auc, "weighted"
else:
    best_test, best_auc, best_name = avg_test, avg_auc, "simple_avg"

np.save("models/v6_ensemble_oof.npy",  ens_oof)
np.save("models/v6_ensemble_test.npy", best_test)

sub6 = f"submissions/v6_xgb_cb_ensemble_{best_name}_oofAUC{best_auc:.4f}.csv"
make_submission(test_proc[ID_COL], best_test, path=sub6)
validate_submission(sub6)

# ── Final summary ──────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("RESULTS SUMMARY")
print(f"  V2  CatBoost default:          OOF=0.68745  Zindi=0.671944")
print(f"  V4  CatBoost Optuna:           OOF=0.68840  Zindi=0.67555")
print(f"  V5  XGBoost:                   OOF={xgb_auc:.5f}  Zindi=???")
print(f"  V6  XGBoost+CatBoost ensemble: OOF={best_auc:.5f}  Zindi=???")
print(f"\nV5 file: {pathlib.Path(sub_path).name}")
print(f"V6 file: {pathlib.Path(sub6).name}")
print(f"\nSubmit V6 first (ensemble is almost always better).")
print(f"Submit V5 only if V6 doesn't improve.")
print("="*60)

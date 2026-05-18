"""
Training — LightGBM only, 5-fold CV. Generates v1 submission.
"""
import sys, pathlib, warnings, time
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from src.preprocessing import load_processed
from src.train import load_folds, cross_validate_model, train_full
from src.models import get_lgbm
from src.config import TARGET_COL, ID_COL
from src.submit import make_submission, validate_submission

# ── Load data ──────────────────────────────────────────────────────────────────
print("Loading processed data...")
train_proc, test_proc = load_processed()
folds = load_folds()

FEATURE_COLS = [c for c in train_proc.columns if c not in [TARGET_COL, ID_COL]]
y = train_proc[TARGET_COL].values

# Encode any remaining string columns (interaction features)
train_feats = train_proc[FEATURE_COLS].copy()
test_feats  = test_proc[FEATURE_COLS].copy()

obj_cols = train_feats.select_dtypes(include="object").columns.tolist()
if obj_cols:
    print(f"Label-encoding string columns: {obj_cols}")
    for col in obj_cols:
        le = LabelEncoder()
        combined = pd.concat([train_feats[col], test_feats[col]], axis=0).astype(str)
        le.fit(combined)
        train_feats[col] = le.transform(train_feats[col].astype(str))
        test_feats[col]  = le.transform(test_feats[col].astype(str))

X      = train_feats.values.astype(np.float32)
X_test = test_feats.values.astype(np.float32)

print(f"Features: {X.shape[1]}  |  Train: {X.shape[0]}  |  Test: {X_test.shape[0]}")
pathlib.Path("models").mkdir(exist_ok=True)

# ── LightGBM 5-fold CV ─────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TRAINING: LightGBM (5-fold CV)")
print("="*60)
t0 = time.time()
lgbm_cv = cross_validate_model(get_lgbm(), X, y, folds, use_smote=False)
elapsed = time.time() - t0
print(f"\nLightGBM done in {elapsed:.0f}s")
print(f"OOF AUC: {lgbm_cv['oof_auc']:.5f}")

np.save("models/lgbm_oof.npy", lgbm_cv["oof_preds"])

# ── Train on full dataset, predict test ────────────────────────────────────────
print("\nTraining on full dataset for test predictions...")
lgbm_full = train_full(get_lgbm(), X, y)
lgbm_test = lgbm_full.predict_proba(X_test)[:, 1]
np.save("models/lgbm_test.npy", lgbm_test)

# ── Save feature importances ───────────────────────────────────────────────────
feat_imp = pd.DataFrame({
    "feature":    FEATURE_COLS,
    "importance": lgbm_full.feature_importances_,
}).sort_values("importance", ascending=False)
feat_imp.to_csv("reports/lgbm_feature_importance.csv", index=False)
print("\nTop 20 features by importance:")
print(feat_imp.head(20).to_string(index=False))

# ── Generate v1 submission ─────────────────────────────────────────────────────
sub_path = f"submissions/v1_lgbm_oofAUC{lgbm_cv['oof_auc']:.4f}.csv"
make_submission(test_proc[ID_COL], lgbm_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V1 SUBMISSION READY: {pathlib.Path(sub_path).name}")
print(f"  Local OOF AUC: {lgbm_cv['oof_auc']:.5f}")
print(f"  Baseline to beat: 0.6451")
print(f"  CV fold AUCs: {[round(a,5) for a in lgbm_cv['cv_aucs']]}")
print(f"{'='*60}")
print("\nNext steps:")
print("  1. Upload this file to Zindi and record the public AUC")
print("  2. Run run_training_xgb.py for v2 (XGBoost)")
print("  3. Update submissions/VERSION_LOG.md with results")

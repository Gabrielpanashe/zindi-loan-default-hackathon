"""
V3 — CatBoost with raw categorical columns (no manual encoding).
CatBoost handles categoricals natively using ordered target statistics,
which avoids the leakage introduced by TargetEncoder fitted on full data.
"""
import sys, pathlib, warnings, time, copy
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

# ── Load RAW data and apply feature engineering only (no encoding) ─────────────
print("Loading raw data + feature engineering...")
train = load_train()
test  = load_test()

train = engineer_all_features(train)
test  = engineer_all_features(test)

# Fill categorical NaN with "Unknown" (CatBoost handles strings natively)
cat_fill = ["collateral_type", "employment_sector", "loan_purpose",
            "marital_status", "province_x_sector", "product_x_purpose"]
for col in cat_fill:
    if col in train.columns:
        train[col] = train[col].fillna("Unknown").astype(str)
        test[col]  = test[col].fillna("Unknown").astype(str)

# Fill numeric NaN with median from train
num_cols = train.select_dtypes(include="number").columns.difference([TARGET_COL])
medians  = train[num_cols].median()
train[num_cols] = train[num_cols].fillna(medians)
test[num_cols]  = test[num_cols].fillna(medians)

# Annual rate: group-wise imputation within product_code
for df in [train, test]:
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median())
    )
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())

# Drop raw date columns (already extracted features from them)
date_cols = ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]
train.drop(columns=[c for c in date_cols if c in train.columns], inplace=True)
test.drop(columns=[c for c in date_cols if c in test.columns],  inplace=True)

# ── Define features and categoricals ──────────────────────────────────────────
FEATURE_COLS = [c for c in train.columns if c not in [TARGET_COL, ID_COL]]
y = train[TARGET_COL].values

# CatBoost needs indices of categorical columns
cat_feature_names = train[FEATURE_COLS].select_dtypes(include="object").columns.tolist()
cat_feature_idx   = [FEATURE_COLS.index(c) for c in cat_feature_names]
print(f"Features: {len(FEATURE_COLS)}  |  Categoricals: {cat_feature_names}")

X      = train[FEATURE_COLS].copy()
X_test = test[FEATURE_COLS].copy()

# ── CatBoost model ────────────────────────────────────────────────────────────
cb_model = CatBoostClassifier(
    iterations          = 3000,
    learning_rate       = 0.03,
    depth               = 6,
    loss_function       = "Logloss",
    eval_metric         = "AUC",
    auto_class_weights  = "Balanced",
    early_stopping_rounds = 150,
    random_seed         = RANDOM_SEED,
    verbose             = 0,
)

# ── 5-fold CV (manual loop — CatBoost needs Pool objects) ─────────────────────
folds = load_folds()
X_arr = X.values
oof_preds = np.zeros(len(y))
cv_aucs   = []

print("\n" + "="*60)
print("V2: CatBoost — raw categoricals, 5-fold CV")
print("="*60)
t0 = time.time()

for fold_idx, (tr_idx, val_idx) in enumerate(folds):
    X_tr,  y_tr  = X_arr[tr_idx],  y[tr_idx]
    X_val, y_val = X_arr[val_idx], y[val_idx]

    train_pool = Pool(X_tr,  y_tr,  cat_features=cat_feature_idx,
                      feature_names=FEATURE_COLS)
    val_pool   = Pool(X_val, y_val, cat_features=cat_feature_idx,
                      feature_names=FEATURE_COLS)

    fold_model = copy.deepcopy(cb_model)
    fold_model.fit(train_pool, eval_set=val_pool, verbose=0)

    preds = fold_model.predict_proba(val_pool)[:, 1]
    oof_preds[val_idx] = preds

    fold_auc = roc_auc_score(y_val, preds)
    cv_aucs.append(fold_auc)
    print(f"  Fold {fold_idx+1}/5  AUC: {fold_auc:.5f}  "
          f"(best iter: {fold_model.best_iteration_})")

oof_auc = roc_auc_score(y, oof_preds)
mean_cv = np.mean(cv_aucs)
std_cv  = np.std(cv_aucs)
print(f"\n  CV AUC:  {mean_cv:.5f} +/- {std_cv:.5f}")
print(f"  OOF AUC: {oof_auc:.5f}")
print(f"  Done in {time.time()-t0:.0f}s")

np.save("models/v2_catboost_oof.npy", oof_preds)

# ── Full retrain ───────────────────────────────────────────────────────────────
print("\nTraining on full dataset...")
# Ensure no NaN remains in categorical columns for test pool
for col in cat_feature_names:
    X_test[col] = X_test[col].fillna("Unknown").astype(str)

full_pool  = Pool(X_arr, y, cat_features=cat_feature_idx, feature_names=FEATURE_COLS)
test_pool  = Pool(X_test.values, cat_features=cat_feature_idx, feature_names=FEATURE_COLS)

cb_full = copy.deepcopy(cb_model)
cb_full.set_params(early_stopping_rounds=None, iterations=3000)
cb_full.fit(full_pool, verbose=0)
cb_test = cb_full.predict_proba(test_pool)[:, 1]
np.save("models/v2_catboost_test.npy", cb_test)

# Feature importance
feat_imp = pd.DataFrame({
    "feature":    FEATURE_COLS,
    "importance": cb_full.get_feature_importance(),
}).sort_values("importance", ascending=False)
print("\nTop 20 features (CatBoost):")
print(feat_imp.head(20).to_string(index=False))

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/v2_catboost_oofAUC{oof_auc:.4f}.csv"
make_submission(test[ID_COL], cb_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V1 OOF AUC: 0.68274  (LightGBM default)")
print(f"V2 OOF AUC: 0.68122  (LightGBM tuned)")
print(f"V2 OOF AUC: {oof_auc:.5f}  (CatBoost native cats)")
print(f"Change vs V1: {oof_auc - 0.68274:+.5f}")
print(f"\nV2 submission: {pathlib.Path(sub_path).name}")
print("="*60)

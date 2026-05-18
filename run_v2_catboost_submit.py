"""
V2 CatBoost — full retrain only (CV already done, OOF AUC=0.68745).
Generates test predictions and submission file.
"""
import sys, pathlib, warnings, copy
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

OOF_AUC = 0.68745

# ── Rebuild the same feature matrix used during CV ────────────────────────────
print("Rebuilding features...")
train = load_train()
test  = load_test()
train = engineer_all_features(train)
test  = engineer_all_features(test)

cat_fill = ["collateral_type","employment_sector","loan_purpose",
            "marital_status","province_x_sector","product_x_purpose"]
for col in cat_fill:
    if col in train.columns:
        train[col] = train[col].fillna("Unknown").astype(str)
        test[col]  = test[col].fillna("Unknown").astype(str)

num_cols = train.select_dtypes(include="number").columns.difference([TARGET_COL])
medians  = train[num_cols].median()
train[num_cols] = train[num_cols].fillna(medians)
test[num_cols]  = test[num_cols].fillna(medians)

for df in [train, test]:
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median()))
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())

date_cols = ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]
train.drop(columns=[c for c in date_cols if c in train.columns], inplace=True)
test.drop(columns=[c for c in date_cols if c in test.columns],  inplace=True)

FEATURE_COLS    = [c for c in train.columns if c not in [TARGET_COL, ID_COL]]
cat_names       = train[FEATURE_COLS].select_dtypes(include="object").columns.tolist()
cat_idx         = [FEATURE_COLS.index(c) for c in cat_names]

# Final NaN cleanup for categorical columns in test
for col in cat_names:
    test[col] = test[col].fillna("Unknown").astype(str)

X      = train[FEATURE_COLS].values
X_test = test[FEATURE_COLS].values
y      = train[TARGET_COL].values

print(f"Features: {len(FEATURE_COLS)}  |  Cats: {len(cat_names)}")

# ── Full retrain on all 38,932 rows ───────────────────────────────────────────
print("Training CatBoost on full dataset...")
cb_full = CatBoostClassifier(
    iterations          = 3000,
    learning_rate       = 0.03,
    depth               = 6,
    loss_function       = "Logloss",
    eval_metric         = "AUC",
    auto_class_weights  = "Balanced",
    random_seed         = RANDOM_SEED,
    verbose             = 100,
)
full_pool = Pool(X, y, cat_features=cat_idx, feature_names=FEATURE_COLS)
cb_full.fit(full_pool)

test_pool = Pool(X_test, cat_features=cat_idx, feature_names=FEATURE_COLS)
cb_test   = cb_full.predict_proba(test_pool)[:, 1]
np.save("models/v2_catboost_test.npy", cb_test)

# Feature importance
feat_imp = pd.DataFrame({
    "feature":    FEATURE_COLS,
    "importance": cb_full.get_feature_importance(),
}).sort_values("importance", ascending=False)
print("\nTop 20 features (CatBoost):")
print(feat_imp.head(20).to_string(index=False))

# ── Generate V2 submission ────────────────────────────────────────────────────
sub_path = f"submissions/v2_catboost_oofAUC{OOF_AUC:.4f}.csv"
make_submission(test[ID_COL], cb_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V1 OOF AUC: 0.68274  (LightGBM default)")
print(f"V2 OOF AUC: {OOF_AUC:.5f}  (CatBoost native cats)  +{OOF_AUC-0.68274:+.5f}")
print(f"\nV2 submission ready: {pathlib.Path(sub_path).name}")
print("Upload this to Zindi next.")
print("="*60)

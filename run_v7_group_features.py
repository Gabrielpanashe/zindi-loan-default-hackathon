"""
V7 — Group aggregation features + CatBoost Optuna retrain.

New features give each loan row population-level context:
- Default rate per employment_sector, product_code, collateral_type
- Mean/std income and loan amount per sector and province
- Borrower's debt_to_income relative to peers in same sector
- Loan amount relative to average for that product_code

All aggregations fitted on training data only, then applied to test (no leakage).
"""
import sys, pathlib, warnings, time, copy
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

# ── Load and engineer base features ───────────────────────────────────────────
print("Building base features...")
train = load_train()
test  = load_test()
train = engineer_all_features(train)
test  = engineer_all_features(test)

# Standard imputation
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

# ── Group aggregation features (fit on train only) ────────────────────────────
print("Adding group aggregation features...")

def add_group_features(train_df, test_df):
    """Compute aggregations on train, map to both train and test."""
    new_train = train_df.copy()
    new_test  = test_df.copy()

    # 1. Default rate per category (target encoding by group — more granular than global)
    for col in ["employment_sector", "product_code", "collateral_type",
                "province", "loan_purpose", "disbursement_channel"]:
        agg = train_df.groupby(col)[TARGET_COL].agg(["mean", "count"])
        agg.columns = [f"{col}_default_rate", f"{col}_count"]
        # Smoothed rate: blend group rate with global rate for small groups
        global_rate = train_df[TARGET_COL].mean()
        agg[f"{col}_smoothed_rate"] = (
            (agg[f"{col}_default_rate"] * agg[f"{col}_count"] + global_rate * 10)
            / (agg[f"{col}_count"] + 10)
        )
        for df in [new_train, new_test]:
            df[f"{col}_default_rate"]   = df[col].map(agg[f"{col}_default_rate"]).fillna(global_rate)
            df[f"{col}_smoothed_rate"]  = df[col].map(agg[f"{col}_smoothed_rate"]).fillna(global_rate)
            df[f"{col}_group_size"]     = df[col].map(agg[f"{col}_count"]).fillna(1)

    # 2. Mean income and loan amount per sector (borrower vs peers)
    for group_col in ["employment_sector", "province", "product_code"]:
        for val_col in ["monthly_income_usd", "amount_usd", "debt_to_income"]:
            grp = train_df.groupby(group_col)[val_col].agg(["mean", "std"])
            grp.columns = [f"{group_col}_{val_col}_mean", f"{group_col}_{val_col}_std"]
            for df in [new_train, new_test]:
                m = df[group_col].map(grp[f"{group_col}_{val_col}_mean"])
                s = df[group_col].map(grp[f"{group_col}_{val_col}_std"]).fillna(1) + 1e-6
                # How many std deviations is this borrower from their peer group?
                df[f"{group_col}_{val_col}_zscore"] = (df[val_col] - m) / s
                df[f"{group_col}_{val_col}_zscore"] = df[f"{group_col}_{val_col}_zscore"].fillna(0)

    # 3. Loan amount relative to product average (is this loan unusually large?)
    prod_mean = train_df.groupby("product_code")["amount_usd"].mean()
    for df in [new_train, new_test]:
        df["amount_vs_product_avg"] = df["amount_usd"] / (
            df["product_code"].map(prod_mean).fillna(train_df["amount_usd"].mean())
        )

    # 4. Rate relative to product average (is this borrower paying unusually high rate?)
    prod_rate_mean = train_df.groupby("product_code")["annual_rate_pct"].mean()
    for df in [new_train, new_test]:
        df["rate_vs_product_avg"] = df["annual_rate_pct"] / (
            df["product_code"].map(prod_rate_mean).fillna(train_df["annual_rate_pct"].mean())
        )

    # 5. Interaction default rates (2-way combinations)
    for g1, g2 in [("employment_sector","collateral_type"),
                   ("province","employment_sector"),
                   ("product_code","employment_sector")]:
        agg2 = train_df.groupby([g1, g2])[TARGET_COL].mean()
        feat_name = f"{g1}_x_{g2}_rate"
        for df in [new_train, new_test]:
            df[feat_name] = pd.MultiIndex.from_arrays(
                [df[g1], df[g2]]
            ).map(agg2.to_dict()).fillna(global_rate)  # type: ignore[arg-type]

    return new_train, new_test

train, test = add_group_features(train, test)

# Count new features added
new_feat_count = len([c for c in train.columns
                      if c not in [TARGET_COL, ID_COL]
                      and "rate" in c or "zscore" in c or "vs_" in c])
print(f"New aggregation features added: ~{new_feat_count}")
print(f"Total features: {len([c for c in train.columns if c not in [TARGET_COL, ID_COL]])}")

# ── Build final feature matrix ─────────────────────────────────────────────────
FEATURE_COLS = [c for c in train.columns if c not in [TARGET_COL, ID_COL]]
cat_names    = train[FEATURE_COLS].select_dtypes(include="object").columns.tolist()
cat_idx      = [FEATURE_COLS.index(c) for c in cat_names]

for col in cat_names:
    test[col] = test[col].fillna("Unknown").astype(str)

# Final NaN cleanup
for df in [train, test]:
    for col in [c for c in FEATURE_COLS if c not in cat_names]:
        if df[col].isna().any():
            df[col] = df[col].fillna(train[col].median())

X      = train[FEATURE_COLS].values
X_test = test[FEATURE_COLS].values
y      = train[TARGET_COL].values
print(f"Feature matrix: {X.shape}")

# ── CatBoost with best Optuna params from V4 ──────────────────────────────────
BEST_PARAMS = {
    "iterations":          3000,
    "learning_rate":       0.011259328251050789,
    "depth":               5,
    "l2_leaf_reg":         14.418948832091033,
    "bagging_temperature": 0.29054832752604903,
    "random_strength":     0.14046693632414226,
    "border_count":        128,
}

folds    = load_folds()
oof      = np.zeros(len(y))
cv_aucs  = []

print("\n" + "="*60)
print("V7: CatBoost (Optuna params) + Group Features — 5-fold CV")
print("="*60)
t0 = time.time()

for fold_idx, (tr_idx, val_idx) in enumerate(folds):
    m = CatBoostClassifier(
        **BEST_PARAMS,
        loss_function         = "Logloss",
        eval_metric           = "AUC",
        auto_class_weights    = "Balanced",
        early_stopping_rounds = 150,
        random_seed           = RANDOM_SEED,
        verbose               = 0,
    )
    tp = Pool(X[tr_idx],  y[tr_idx],  cat_features=cat_idx)
    vp = Pool(X[val_idx], y[val_idx], cat_features=cat_idx)
    m.fit(tp, eval_set=vp)
    preds = m.predict_proba(vp)[:, 1]
    oof[val_idx] = preds
    fold_auc = roc_auc_score(y[val_idx], preds)
    cv_aucs.append(fold_auc)
    print(f"  Fold {fold_idx+1}/5  AUC: {fold_auc:.5f}  (iter: {m.best_iteration_})")

oof_auc = roc_auc_score(y, oof)
print(f"\n  5-fold CV AUC: {np.mean(cv_aucs):.5f} +/- {np.std(cv_aucs):.5f}")
print(f"  OOF AUC:       {oof_auc:.5f}")
print(f"  Done in {time.time()-t0:.0f}s")
np.save("models/v7_catboost_oof.npy", oof)

# ── Full retrain ───────────────────────────────────────────────────────────────
print("\nFull retrain...")
cb_full = CatBoostClassifier(
    **BEST_PARAMS,
    loss_function      = "Logloss",
    eval_metric        = "AUC",
    auto_class_weights = "Balanced",
    random_seed        = RANDOM_SEED,
    verbose            = 100,
)
cb_full.fit(Pool(X, y, cat_features=cat_idx, feature_names=FEATURE_COLS))
v7_test = cb_full.predict_proba(
    Pool(X_test, cat_features=cat_idx, feature_names=FEATURE_COLS)
)[:, 1]
np.save("models/v7_catboost_test.npy", v7_test)

# Feature importance — did new features help?
feat_imp = pd.DataFrame({
    "feature":    FEATURE_COLS,
    "importance": cb_full.get_feature_importance(),
}).sort_values("importance", ascending=False)
print("\nTop 25 features (V7):")
print(feat_imp.head(25).to_string(index=False))
new_feats_in_top = feat_imp.head(25)["feature"].str.contains(
    "rate|zscore|vs_|group_size|smoothed"
).sum()
print(f"\nNew group features in top 25: {new_feats_in_top}")

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/v7_catboost_group_feats_oofAUC{oof_auc:.4f}.csv"
make_submission(test[ID_COL], v7_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V4  CatBoost Optuna (no group feats): OOF=0.68840  Zindi=0.67555")
print(f"V7  CatBoost Optuna + group feats:    OOF={oof_auc:.5f}  Zindi=???")
print(f"Change: {oof_auc - 0.68840:+.5f}")
print(f"\nV7 file: {pathlib.Path(sub_path).name}")
print("="*60)

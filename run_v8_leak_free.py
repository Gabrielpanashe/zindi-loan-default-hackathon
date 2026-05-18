"""
V8 — Leak-free group features with CatBoost.

V7's group stats were computed on the FULL training set, leaking target info
into validation folds (inflated local OOF by +0.004 but hurt Zindi by -0.0006).

Fix: compute group stats INSIDE each fold's training portion only.
For test predictions: compute stats on full training set (no leakage since test
has no target labels).

This is the correct implementation of target encoding / group statistics.
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

BEST_PARAMS = {
    "iterations":          3000,
    "learning_rate":       0.011259328251050789,
    "depth":               5,
    "l2_leaf_reg":         14.418948832091033,
    "bagging_temperature": 0.29054832752604903,
    "random_strength":     0.14046693632414226,
    "border_count":        128,
}

# ── Build base feature DataFrame (no group features yet) ──────────────────────
print("Building base features...")

def build_base(df_raw):
    df = engineer_all_features(df_raw.copy())
    cat_fill = ["collateral_type","employment_sector","loan_purpose",
                "marital_status","province_x_sector","product_x_purpose"]
    for col in cat_fill:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
    num_cols = df.select_dtypes(include="number").columns.difference([TARGET_COL])
    df[num_cols] = df[num_cols].fillna(df[num_cols].median())
    for col_a in df.columns:
        if df[col_a].dtype == object and col_a in df.columns:
            df[col_a] = df[col_a].fillna("Unknown").astype(str)
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median()))
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())
    date_cols = ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]
    df.drop(columns=[c for c in date_cols if c in df.columns], inplace=True)
    return df

train_raw = load_train()
test_raw  = load_test()
train_base = build_base(train_raw)
test_base  = build_base(test_raw)

BASE_FEATURE_COLS = [c for c in train_base.columns if c not in [TARGET_COL, ID_COL]]
y_full = train_base[TARGET_COL].values
global_rate = y_full.mean()

# ── Leak-free group feature function ──────────────────────────────────────────
GROUP_SPECS = [
    # (group_col, value_col, stat) — None for value_col means target rate
    ("employment_sector",    None,                "rate"),
    ("product_code",         None,                "rate"),
    ("collateral_type",      None,                "rate"),
    ("province",             None,                "rate"),
    ("loan_purpose",         None,                "rate"),
    ("employment_sector",    "monthly_income_usd","mean"),
    ("employment_sector",    "debt_to_income",    "zscore"),
    ("product_code",         "amount_usd",        "ratio"),
    ("product_code",         "debt_to_income",    "zscore"),
    ("province",             "monthly_income_usd","zscore"),
    # 2-way interaction rates
    (("product_code","employment_sector"), None, "rate"),
    (("province","employment_sector"),     None, "rate"),
    (("employment_sector","collateral_type"), None, "rate"),
]

def add_group_features_fold(train_fold_df, apply_df, train_target):
    """
    Compute group statistics on train_fold_df (training portion of fold),
    then apply them to apply_df (validation or test). No leakage.
    """
    result = apply_df.copy()
    g_rate  = train_target.mean()

    for spec in GROUP_SPECS:
        g_col, v_col, stat = spec

        # ── Single-column group ─────────────────────────────────────────────
        if isinstance(g_col, str):
            if stat == "rate" and v_col is None:
                agg = pd.Series(train_target.values,
                                index=train_fold_df.index).groupby(
                    train_fold_df[g_col]).agg(["mean","count"])
                # Smoothed Bayesian rate
                smoothed = (agg["mean"]*agg["count"] + g_rate*10) / (agg["count"]+10)
                feat_name = f"{g_col}_cv_rate"
                result[feat_name] = result[g_col].map(smoothed.to_dict()).fillna(g_rate)

            elif stat == "mean" and v_col:
                m = train_fold_df.groupby(g_col)[v_col].mean()
                result[f"{g_col}_{v_col}_cv_mean"] = result[g_col].map(m).fillna(
                    train_fold_df[v_col].mean())

            elif stat == "zscore" and v_col:
                grp = train_fold_df.groupby(g_col)[v_col].agg(["mean","std"])
                m = result[g_col].map(grp["mean"]).fillna(train_fold_df[v_col].mean())
                s = result[g_col].map(grp["std"]).fillna(1).clip(lower=1e-6)
                result[f"{g_col}_{v_col}_cv_zscore"] = (result[v_col] - m) / s

            elif stat == "ratio" and v_col:
                m = train_fold_df.groupby(g_col)[v_col].mean()
                result[f"{g_col}_{v_col}_cv_ratio"] = result[v_col] / (
                    result[g_col].map(m).fillna(train_fold_df[v_col].mean()).clip(lower=1))

        # ── Two-column interaction ──────────────────────────────────────────
        else:
            g1, g2 = g_col
            if stat == "rate":
                grp2 = pd.Series(train_target.values,
                                 index=train_fold_df.index).groupby(
                    [train_fold_df[g1], train_fold_df[g2]]).agg(["mean","count"])
                smoothed2 = (grp2["mean"]*grp2["count"] + g_rate*5) / (grp2["count"]+5)
                feat_name = f"{g1}_x_{g2}_cv_rate"
                result[feat_name] = [
                    smoothed2.get((a, b), g_rate)
                    for a, b in zip(result[g1], result[g2])
                ]

    return result

# ── 5-fold CV with leak-free group features ───────────────────────────────────
folds    = load_folds()
oof      = np.zeros(len(y_full))
cv_aucs  = []

print("\n" + "="*60)
print("V8: CatBoost + leak-free group features (5-fold CV)")
print("="*60)
t0 = time.time()

for fold_idx, (tr_idx, val_idx) in enumerate(folds):
    # Compute group stats on training fold only
    tr_base = train_base.iloc[tr_idx]
    vl_base = train_base.iloc[val_idx]
    tr_tgt  = pd.Series(y_full[tr_idx], index=tr_base.index)

    tr_aug = add_group_features_fold(tr_base, tr_base, tr_tgt)
    vl_aug = add_group_features_fold(tr_base, vl_base, tr_tgt)

    feat_cols = [c for c in tr_aug.columns if c not in [TARGET_COL, ID_COL]]
    cat_cols  = tr_aug[feat_cols].select_dtypes(include="object").columns.tolist()
    cat_idx_  = [feat_cols.index(c) for c in cat_cols]

    X_tr  = tr_aug[feat_cols].values
    X_val = vl_aug[feat_cols].values
    y_tr  = y_full[tr_idx]
    y_val = y_full[val_idx]

    m = CatBoostClassifier(
        **BEST_PARAMS,
        loss_function         = "Logloss",
        eval_metric           = "AUC",
        auto_class_weights    = "Balanced",
        early_stopping_rounds = 150,
        random_seed           = RANDOM_SEED,
        verbose               = 0,
    )
    m.fit(Pool(X_tr, y_tr, cat_features=cat_idx_),
          eval_set=Pool(X_val, y_val, cat_features=cat_idx_))

    preds = m.predict_proba(Pool(X_val, cat_features=cat_idx_))[:, 1]
    oof[val_idx] = preds
    fold_auc = roc_auc_score(y_val, preds)
    cv_aucs.append(fold_auc)
    print(f"  Fold {fold_idx+1}/5  AUC: {fold_auc:.5f}  (iter: {m.best_iteration_})")

oof_auc = roc_auc_score(y_full, oof)
print(f"\n  5-fold CV AUC: {np.mean(cv_aucs):.5f} +/- {np.std(cv_aucs):.5f}")
print(f"  OOF AUC:       {oof_auc:.5f}")
print(f"  Done in {time.time()-t0:.0f}s")
np.save("models/v8_catboost_oof.npy", oof)

# ── Full retrain — group stats from full training set (safe for test) ─────────
print("\nFull retrain with group stats from full training data...")
tr_full_aug = add_group_features_fold(
    train_base, train_base,
    pd.Series(y_full, index=train_base.index))
te_full_aug = add_group_features_fold(
    train_base, test_base,
    pd.Series(y_full, index=train_base.index))

FINAL_FEAT_COLS = [c for c in tr_full_aug.columns if c not in [TARGET_COL, ID_COL]]
final_cat_cols  = tr_full_aug[FINAL_FEAT_COLS].select_dtypes(include="object").columns.tolist()
final_cat_idx   = [FINAL_FEAT_COLS.index(c) for c in final_cat_cols]

for col in final_cat_cols:
    te_full_aug[col] = te_full_aug[col].fillna("Unknown").astype(str)

cb_full = CatBoostClassifier(
    **BEST_PARAMS,
    loss_function      = "Logloss",
    eval_metric        = "AUC",
    auto_class_weights = "Balanced",
    random_seed        = RANDOM_SEED,
    verbose            = 100,
)
cb_full.fit(Pool(tr_full_aug[FINAL_FEAT_COLS].values, y_full,
                 cat_features=final_cat_idx, feature_names=FINAL_FEAT_COLS))

v8_test = cb_full.predict_proba(
    Pool(te_full_aug[FINAL_FEAT_COLS].values,
         cat_features=final_cat_idx, feature_names=FINAL_FEAT_COLS))[:, 1]
np.save("models/v8_catboost_test.npy", v8_test)

# Feature importance
feat_imp = pd.DataFrame({
    "feature":    FINAL_FEAT_COLS,
    "importance": cb_full.get_feature_importance(),
}).sort_values("importance", ascending=False)
print("\nTop 20 features (V8 — leak-free):")
print(feat_imp.head(20).to_string(index=False))

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/v8_catboost_leakfree_oofAUC{oof_auc:.4f}.csv"
make_submission(test_base[ID_COL], v8_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V4  CatBoost Optuna (clean):       OOF=0.68840  Zindi=0.67556")
print(f"V7  CatBoost + leaky group feats:  OOF=0.69234  Zindi=0.67501")
print(f"V8  CatBoost + leak-free groups:   OOF={oof_auc:.5f}  Zindi=???")
print(f"\nIf V8 local OOF is higher than V4 AND the AUC gap is ~0.013 (not wider),")
print(f"the features are genuinely helping.")
print(f"V8 file: {pathlib.Path(sub_path).name}")
print("="*60)

"""
V10 — Seed ensemble: 7 CatBoost models with V4 best params, different seeds.

Why this works:
  CatBoost uses random splits (bagging_temperature, random_strength) during training.
  Different seeds explore different paths through the data.
  Averaging 7 predictions reduces variance by ~sqrt(7) ≈ 2.6x.
  This is the cleanest form of ensembling — no leakage, no new features, same algorithm.

Expected gain: +0.001 to +0.003 on Zindi.
"""
import sys, pathlib, warnings, time
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
from src.config import TARGET_COL, ID_COL
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

SEEDS = [42, 123, 456, 789, 1337, 2024, 9999]

# ── Build features (V9 — correct dates) ───────────────────────────────────────
print("Building features...")

def build(df_raw, train_medians=None):
    df = engineer_all_features(df_raw.copy())
    for col in ["collateral_type","employment_sector","loan_purpose",
                "marital_status","province_x_sector","product_x_purpose"]:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
    num_cols = df.select_dtypes(include="number").columns.difference([TARGET_COL])
    if train_medians is not None:
        for c in num_cols:
            df[c] = df[c].fillna(train_medians.get(c, df[c].median()))
    else:
        for c in num_cols:
            df[c] = df[c].fillna(df[c].median())
    for c in df.select_dtypes(include="object").columns:
        df[c] = df[c].fillna("Unknown").astype(str)
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median()))
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())
    date_cols = ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]
    df.drop(columns=[c for c in date_cols if c in df.columns], inplace=True)
    return df

train_raw  = load_train()
train_base = build(train_raw)
train_meds = train_base.select_dtypes(include="number").median().to_dict()
test_base  = build(load_test(), train_medians=train_meds)

FEATURE_COLS = [c for c in train_base.columns if c not in [TARGET_COL, ID_COL]]
cat_names    = train_base[FEATURE_COLS].select_dtypes(include="object").columns.tolist()
cat_idx      = [FEATURE_COLS.index(c) for c in cat_names]
for col in cat_names:
    test_base[col] = test_base[col].fillna("Unknown").astype(str)

X      = train_base[FEATURE_COLS].values
X_test = test_base[FEATURE_COLS].values
y      = train_base[TARGET_COL].values
folds  = load_folds()
print(f"Features: {len(FEATURE_COLS)}  |  Seeds: {SEEDS}")

# ── Train one model per seed, collect OOF + test preds ────────────────────────
all_oof_preds  = []
all_test_preds = []
seed_aucs      = []

print("\n" + "="*60)
print(f"V10: Seed ensemble ({len(SEEDS)} seeds × 5-fold CV)")
print("="*60)
t0 = time.time()

for seed in SEEDS:
    seed_oof = np.zeros(len(y))

    for fold_idx, (tr_idx, val_idx) in enumerate(folds):
        m = CatBoostClassifier(
            **BEST_PARAMS,
            loss_function         = "Logloss",
            eval_metric           = "AUC",
            auto_class_weights    = "Balanced",
            early_stopping_rounds = 150,
            random_seed           = seed,
            verbose               = 0,
        )
        m.fit(Pool(X[tr_idx], y[tr_idx], cat_features=cat_idx),
              eval_set=Pool(X[val_idx], y[val_idx], cat_features=cat_idx))
        seed_oof[val_idx] = m.predict_proba(
            Pool(X[val_idx], cat_features=cat_idx))[:, 1]

    seed_auc = roc_auc_score(y, seed_oof)
    seed_aucs.append(seed_auc)
    all_oof_preds.append(seed_oof)

    # Full retrain for test predictions
    m_full = CatBoostClassifier(
        **BEST_PARAMS,
        loss_function      = "Logloss",
        eval_metric        = "AUC",
        auto_class_weights = "Balanced",
        random_seed        = seed,
        verbose            = 0,
    )
    m_full.fit(Pool(X, y, cat_features=cat_idx))
    seed_test = m_full.predict_proba(Pool(X_test, cat_features=cat_idx))[:, 1]
    all_test_preds.append(seed_test)

    elapsed = time.time() - t0
    print(f"  Seed {seed:>4}:  OOF AUC={seed_auc:.5f}  "
          f"({elapsed/60:.1f} min elapsed)")

# ── Average across all seeds ───────────────────────────────────────────────────
ens_oof  = np.mean(all_oof_preds,  axis=0)
ens_test = np.mean(all_test_preds, axis=0)
ens_auc  = roc_auc_score(y, ens_oof)

np.save("models/v10_seed_ensemble_oof.npy",  ens_oof)
np.save("models/v10_seed_ensemble_test.npy", ens_test)

print(f"\n  Individual seed AUCs: {[round(a,5) for a in seed_aucs]}")
print(f"  Mean single seed AUC: {np.mean(seed_aucs):.5f}")
print(f"  Ensemble OOF AUC:     {ens_auc:.5f}  "
      f"({'▲' if ens_auc > 0.68840 else '▼'}{abs(ens_auc-0.68840):.5f} vs V4)")

# ── Generate V10 submission ────────────────────────────────────────────────────
sub_path = f"submissions/v10_seed_ensemble_oofAUC{ens_auc:.4f}.csv"
make_submission(test_base[ID_COL], ens_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V4   CatBoost single seed 42:    OOF=0.68840  Zindi=0.67556")
print(f"V10  Seed ensemble ({len(SEEDS)} seeds):  OOF={ens_auc:.5f}  Zindi=???")
print(f"\nV10 file: {pathlib.Path(sub_path).name}")
print(f"Total time: {(time.time()-t0)/60:.1f} min")
print("="*60)

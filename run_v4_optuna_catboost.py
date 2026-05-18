"""
V4 — Optuna hyperparameter tuning on CatBoost.
Searches: depth, learning_rate, l2_leaf_reg, bagging_temperature, random_strength.
Uses 3-fold CV (faster than 5-fold) for the search, then validates best params on 5-fold.
"""
import sys, pathlib, warnings, time, copy
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

from catboost import CatBoostClassifier, Pool
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

# ── Build feature matrix (same as V2) ─────────────────────────────────────────
print("Building features...")
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

FEATURE_COLS  = [c for c in train.columns if c not in [TARGET_COL, ID_COL]]
cat_names     = train[FEATURE_COLS].select_dtypes(include="object").columns.tolist()
cat_idx       = [FEATURE_COLS.index(c) for c in cat_names]

for col in cat_names:
    test[col] = test[col].fillna("Unknown").astype(str)

X      = train[FEATURE_COLS].values
X_test = test[FEATURE_COLS].values
y      = train[TARGET_COL].values

print(f"Features: {len(FEATURE_COLS)}  |  Categoricals: {len(cat_names)}")

# ── Optuna objective (3-fold for speed during search) ─────────────────────────
skf3 = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_SEED)
folds3 = list(skf3.split(X, y))

def objective(trial):
    params = {
        "iterations":         trial.suggest_int("iterations", 1000, 4000, step=500),
        "learning_rate":      trial.suggest_float("learning_rate", 0.01, 0.1, log=True),
        "depth":              trial.suggest_int("depth", 4, 8),
        "l2_leaf_reg":        trial.suggest_float("l2_leaf_reg", 1.0, 20.0, log=True),
        "bagging_temperature":trial.suggest_float("bagging_temperature", 0.0, 1.0),
        "random_strength":    trial.suggest_float("random_strength", 0.1, 3.0),
        "border_count":       trial.suggest_categorical("border_count", [64, 128, 254]),
    }
    oof = np.zeros(len(y))
    for tr_idx, val_idx in folds3:
        m = CatBoostClassifier(
            **params,
            loss_function       = "Logloss",
            eval_metric         = "AUC",
            auto_class_weights  = "Balanced",
            early_stopping_rounds = 100,
            random_seed         = RANDOM_SEED,
            verbose             = 0,
        )
        tp = Pool(X[tr_idx],  y[tr_idx],  cat_features=cat_idx)
        vp = Pool(X[val_idx], y[val_idx], cat_features=cat_idx)
        m.fit(tp, eval_set=vp)
        oof[val_idx] = m.predict_proba(vp)[:, 1]
    return roc_auc_score(y, oof)

print("\nRunning Optuna (50 trials, ~15 min)...")
study = optuna.create_study(
    direction="maximize",
    sampler=optuna.samplers.TPESampler(seed=RANDOM_SEED),
)
study.optimize(objective, n_trials=50, show_progress_bar=True)

print(f"\nBest 3-fold AUC: {study.best_value:.5f}")
print(f"Best params:     {study.best_params}")

# ── Validate best params on 5-fold CV ─────────────────────────────────────────
print("\nValidating best params on full 5-fold CV...")
folds5   = load_folds()
best_p   = study.best_params
oof5     = np.zeros(len(y))
cv5_aucs = []

for fold_idx, (tr_idx, val_idx) in enumerate(folds5):
    m = CatBoostClassifier(
        **best_p,
        loss_function        = "Logloss",
        eval_metric          = "AUC",
        auto_class_weights   = "Balanced",
        early_stopping_rounds= 100,
        random_seed          = RANDOM_SEED,
        verbose              = 0,
    )
    tp = Pool(X[tr_idx],  y[tr_idx],  cat_features=cat_idx)
    vp = Pool(X[val_idx], y[val_idx], cat_features=cat_idx)
    m.fit(tp, eval_set=vp)
    preds = m.predict_proba(vp)[:, 1]
    oof5[val_idx] = preds
    fold_auc = roc_auc_score(y[val_idx], preds)
    cv5_aucs.append(fold_auc)
    print(f"  Fold {fold_idx+1}/5  AUC: {fold_auc:.5f}  (iter: {m.best_iteration_})")

oof5_auc = roc_auc_score(y, oof5)
print(f"\n  5-fold CV AUC:  {np.mean(cv5_aucs):.5f} +/- {np.std(cv5_aucs):.5f}")
print(f"  OOF AUC:        {oof5_auc:.5f}")
np.save("models/v4_catboost_oof.npy", oof5)

# ── Full retrain with best params ─────────────────────────────────────────────
print("\nFull retrain on all data...")
cb_best = CatBoostClassifier(
    **best_p,
    loss_function       = "Logloss",
    eval_metric         = "AUC",
    auto_class_weights  = "Balanced",
    random_seed         = RANDOM_SEED,
    verbose             = 100,
)
full_pool = Pool(X, y, cat_features=cat_idx, feature_names=FEATURE_COLS)
test_pool = Pool(X_test, cat_features=cat_idx, feature_names=FEATURE_COLS)
cb_best.fit(full_pool)
v4_test = cb_best.predict_proba(test_pool)[:, 1]
np.save("models/v4_catboost_test.npy", v4_test)

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/v4_catboost_optuna_oofAUC{oof5_auc:.4f}.csv"
make_submission(test[ID_COL], v4_test, path=sub_path)
validate_submission(sub_path)

print(f"\n{'='*60}")
print(f"V2  CatBoost default:  OOF=0.68745  Zindi=0.671944")
print(f"V4  CatBoost Optuna:   OOF={oof5_auc:.5f}  Zindi=???")
print(f"Change vs V2: {oof5_auc - 0.68745:+.5f}")
print(f"\nBest params: {best_p}")
print(f"V4 file: {pathlib.Path(sub_path).name}")
print("="*60)

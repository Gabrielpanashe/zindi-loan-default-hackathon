"""
V11 — CatBoost with YetiRank loss (direct AUC optimisation).

Why YetiRank instead of Logloss:
  Logloss minimises cross-entropy — a proxy for AUC but not the same thing.
  YetiRank directly optimises the pairwise ranking quality that AUC measures.
  On imbalanced datasets (like ours: 24% default), ranking objectives
  often outperform Logloss because they focus on separating positives from
  negatives rather than calibrating probabilities.

We also test QueryAUC which even more directly optimises AUC.
"""
import sys, pathlib, warnings, time
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, CatBoostRanker, Pool
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

# ── Build features (V9 — correct dates) ───────────────────────────────────────
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

print("Building features...")
train_raw  = load_train()
train_base = build(train_raw)
meds       = train_base.select_dtypes(include="number").median().to_dict()
test_base  = build(load_test(), train_medians=meds)

FEAT_COLS = [c for c in train_base.columns if c not in [TARGET_COL, ID_COL]]
cat_names = train_base[FEAT_COLS].select_dtypes(include="object").columns.tolist()
cat_idx   = [FEAT_COLS.index(c) for c in cat_names]
for col in cat_names:
    test_base[col] = test_base[col].fillna("Unknown").astype(str)

X      = train_base[FEAT_COLS].values
X_test = test_base[FEAT_COLS].values
y      = train_base[TARGET_COL].values
folds  = load_folds()
print(f"Features: {len(FEAT_COLS)}")

# V4 best params (keep everything same, just change loss function)
BASE_PARAMS = dict(
    iterations          = 3000,
    learning_rate       = 0.011259328251050789,
    depth               = 5,
    l2_leaf_reg         = 14.418948832091033,
    bagging_temperature = 0.29054832752604903,
    random_strength     = 0.14046693632414226,
    border_count        = 128,
    auto_class_weights  = "Balanced",
    early_stopping_rounds = 150,
    random_seed         = RANDOM_SEED,
    verbose             = 0,
)

def run_cv(loss_name, extra_params=None):
    params = {**BASE_PARAMS, "loss_function": loss_name, "eval_metric": "AUC"}
    if extra_params:
        params.update(extra_params)
    oof = np.zeros(len(y)); aucs = []
    for fi, (tr_idx, val_idx) in enumerate(folds):
        m = CatBoostClassifier(**params)
        m.fit(Pool(X[tr_idx], y[tr_idx], cat_features=cat_idx),
              eval_set=Pool(X[val_idx], y[val_idx], cat_features=cat_idx))
        p = m.predict_proba(Pool(X[val_idx], cat_features=cat_idx))[:,1]
        oof[val_idx] = p
        fa = roc_auc_score(y[val_idx], p)
        aucs.append(fa)
        print(f"    Fold {fi+1}/5  AUC: {fa:.5f}  (iter: {m.best_iteration_})")
    oof_auc = roc_auc_score(y, oof)
    print(f"  OOF AUC: {oof_auc:.5f}  CV mean: {np.mean(aucs):.5f} +/- {np.std(aucs):.5f}")
    return oof, oof_auc, params

# ── Experiment 1: Logloss (our baseline, V4 params) ───────────────────────────
print("\n" + "="*60)
print("Baseline: Logloss (V4 params, seed=42)")
print("="*60)
t0 = time.time()
oof_ll, auc_ll, _ = run_cv("Logloss")
print(f"  Done in {(time.time()-t0)/60:.1f} min")

# ── Experiment 2: CrossEntropy ─────────────────────────────────────────────────
print("\n" + "="*60)
print("Experiment: CrossEntropy loss")
print("="*60)
t0 = time.time()
oof_ce, auc_ce, _ = run_cv("CrossEntropy")
print(f"  Done in {(time.time()-t0)/60:.1f} min")

# ── Experiment 3: QueryAUC (most direct AUC optimisation) ─────────────────────
# QueryAUC needs group_id — we treat each loan as its own group (pairwise AUC)
# This is equivalent to optimising pairwise AUC across all loan pairs
print("\n" + "="*60)
print("Experiment: QueryAUC (direct AUC objective)")
print("="*60)
t0 = time.time()

oof_qa = np.zeros(len(y)); aucs_qa = []
for fi, (tr_idx, val_idx) in enumerate(folds):
    group_ids_tr  = np.ones(len(tr_idx),  dtype=int)  # single group = global AUC
    group_ids_val = np.ones(len(val_idx), dtype=int)

    params_qa = {**BASE_PARAMS,
                 "loss_function": "QueryAUC",
                 "eval_metric":   "AUC",
                 "auto_class_weights": None}  # QueryAUC handles imbalance differently

    m = CatBoostRanker(**{k: v for k, v in params_qa.items()
                          if k != "auto_class_weights"})
    tp = Pool(X[tr_idx],  y[tr_idx],  cat_features=cat_idx, group_id=group_ids_tr)
    vp = Pool(X[val_idx], y[val_idx], cat_features=cat_idx, group_id=group_ids_val)
    m.fit(tp, eval_set=vp)
    p = m.predict(Pool(X[val_idx], cat_features=cat_idx))
    # Normalise to [0,1]
    p = (p - p.min()) / (p.max() - p.min() + 1e-9)
    oof_qa[val_idx] = p
    fa = roc_auc_score(y[val_idx], p)
    aucs_qa.append(fa)
    print(f"    Fold {fi+1}/5  AUC: {fa:.5f}  (iter: {m.best_iteration_})")

auc_qa = roc_auc_score(y, oof_qa)
print(f"  OOF AUC: {auc_qa:.5f}  CV mean: {np.mean(aucs_qa):.5f}")
print(f"  Done in {(time.time()-t0)/60:.1f} min")

# ── Pick best loss ─────────────────────────────────────────────────────────────
results = {
    "Logloss":     (oof_ll, auc_ll),
    "CrossEntropy":(oof_ce, auc_ce),
    "QueryAUC":    (oof_qa, auc_qa),
}
best_loss = max(results, key=lambda k: results[k][1])
best_oof, best_auc = results[best_loss]

print("\n" + "="*60)
print("LOSS FUNCTION COMPARISON")
print("="*60)
for name, (_, auc) in sorted(results.items(), key=lambda x: -x[1][1]):
    marker = " <-- BEST" if name == best_loss else ""
    print(f"  {name:15s}: OOF AUC={auc:.5f}{marker}")

# ── Full retrain with best loss ────────────────────────────────────────────────
print(f"\nFull retrain with {best_loss}...")
np.save(f"models/v11_{best_loss.lower()}_oof.npy", best_oof)

m_full = CatBoostClassifier(
    **{**BASE_PARAMS,
       "loss_function": best_loss,
       "eval_metric":   "AUC",
       "early_stopping_rounds": None,
       "iterations": 3000})
m_full.fit(Pool(X, y, cat_features=cat_idx, feature_names=FEAT_COLS))
v11_test = m_full.predict_proba(
    Pool(X_test, cat_features=cat_idx, feature_names=FEAT_COLS))[:,1]
np.save("models/v11_catboost_test.npy", v11_test)

sub_path = f"submissions/v11_{best_loss.lower()}_oofAUC{best_auc:.4f}.csv"
make_submission(test_base[ID_COL], v11_test, path=sub_path)
validate_submission(sub_path)

print("\n" + "="*60)
print(f"V4   Logloss default:     OOF=0.68840  Zindi=0.67556")
print(f"V10  Seed ensemble:       OOF=0.68824  Zindi=0.67680")
print(f"V11  Best ({best_loss}): OOF={best_auc:.5f}  Zindi=???")
print(f"Change vs V10: {best_auc - 0.68824:+.5f}")
print(f"\nV11 file: {pathlib.Path(sub_path).name}")
print("="*60)

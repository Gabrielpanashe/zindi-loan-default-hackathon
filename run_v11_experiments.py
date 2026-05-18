"""
V11 — Systematic CatBoost experiments on the same feature set.
Tests 3 genuine algorithmic changes from V4 baseline:

  A. Lossguide grow policy (leaf-wise like LightGBM vs symmetric tree default)
  B. CrossEntropy loss (different gradient signal, no auto_class_weights)
  C. V4 params with depth=6 + stronger l2 (slightly more capacity + regularised)

We already know Logloss OOF=0.68838. Only keep variants that beat it.
"""
import sys, pathlib, warnings, time
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED, SCALE_POS_WEIGHT
from src.submit import make_submission, validate_submission

def build(df_raw, meds=None):
    df = engineer_all_features(df_raw.copy())
    for col in ["collateral_type","employment_sector","loan_purpose",
                "marital_status","province_x_sector","product_x_purpose"]:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
    num_cols = df.select_dtypes(include="number").columns.difference([TARGET_COL])
    for c in num_cols:
        df[c] = df[c].fillna(meds.get(c, df[c].median()) if meds else df[c].median())
    for c in df.select_dtypes(include="object").columns:
        df[c] = df[c].fillna("Unknown").astype(str)
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median()))
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())
    for dc in ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]:
        if dc in df.columns: df.drop(columns=[dc], inplace=True)
    return df

print("Building features...")
tr_raw  = load_train()
tr_base = build(tr_raw)
meds    = tr_base.select_dtypes(include="number").median().to_dict()
te_base = build(load_test(), meds)

FEAT    = [c for c in tr_base.columns if c not in [TARGET_COL, ID_COL]]
cats    = tr_base[FEAT].select_dtypes(include="object").columns.tolist()
cat_idx = [FEAT.index(c) for c in cats]
for c in cats: te_base[c] = te_base[c].fillna("Unknown").astype(str)

X      = tr_base[FEAT].values
X_test = te_base[FEAT].values
y      = tr_base[TARGET_COL].values
folds  = load_folds()

LOGLOSS_OOF_AUC = 0.68838  # V4 baseline

def run_cv(label, model_params):
    print(f"\n{'='*60}\n{label}\n{'='*60}")
    t0  = time.time()
    oof = np.zeros(len(y))
    for fi, (tr_i, val_i) in enumerate(folds):
        m = CatBoostClassifier(**model_params)
        m.fit(Pool(X[tr_i], y[tr_i], cat_features=cat_idx),
              eval_set=Pool(X[val_i], y[val_i], cat_features=cat_idx))
        p = m.predict_proba(Pool(X[val_i], cat_features=cat_idx))[:,1]
        oof[val_i] = p
        print(f"  Fold {fi+1}/5  AUC: {roc_auc_score(y[val_i],p):.5f}  (iter: {m.best_iteration_})")
    auc = roc_auc_score(y, oof)
    print(f"  OOF AUC: {auc:.5f}  change vs V4: {auc-LOGLOSS_OOF_AUC:+.5f}  ({(time.time()-t0)/60:.1f} min)")
    return oof, auc

BASE = dict(iterations=3000, learning_rate=0.011259328251050789, depth=5,
            l2_leaf_reg=14.418948832091033, bagging_temperature=0.29054832752604903,
            random_strength=0.14046693632414226, border_count=128,
            early_stopping_rounds=150, random_seed=RANDOM_SEED, verbose=0)

# ── Experiment A: Lossguide grow policy ───────────────────────────────────────
oof_a, auc_a = run_cv(
    "A: Lossguide grow policy (leaf-wise, max 31 leaves)",
    {**BASE, "loss_function": "Logloss", "eval_metric": "AUC",
     "grow_policy": "Lossguide", "max_leaves": 31,
     "auto_class_weights": "Balanced"})

# ── Experiment B: CrossEntropy (class_weights via scale_pos_weight) ───────────
oof_b, auc_b = run_cv(
    "B: CrossEntropy loss (no auto_class_weights)",
    {**BASE, "loss_function": "CrossEntropy", "eval_metric": "AUC",
     "class_weights": [1.0, SCALE_POS_WEIGHT]})

# ── Experiment C: Slightly deeper + stronger regularisation ───────────────────
oof_c, auc_c = run_cv(
    "C: depth=6, l2=20, lr=0.009 (more capacity + regularised)",
    {**BASE, "loss_function": "Logloss", "eval_metric": "AUC",
     "depth": 6, "l2_leaf_reg": 20.0, "learning_rate": 0.009,
     "auto_class_weights": "Balanced"})

# ── Summary ────────────────────────────────────────────────────────────────────
all_results = {
    "A_Lossguide":    (oof_a, auc_a),
    "B_CrossEntropy": (oof_b, auc_b),
    "C_Depth6":       (oof_c, auc_c),
}

print("\n" + "="*60)
print("RESULTS SUMMARY")
print("="*60)
print(f"  V4  Logloss baseline:  OOF=0.68838  Zindi=0.67556")
print(f"  V10 Seed ensemble:     OOF=0.68824  Zindi=0.67680  (BEST Zindi)")
for name, (_, auc) in sorted(all_results.items(), key=lambda x: -x[1][1]):
    flag = " <-- NEW BEST" if auc > 0.68838 else ""
    print(f"  {name:20s}: OOF={auc:.5f}{flag}")

# ── Generate submission for best variant (if it beats V4) ─────────────────────
best_name = max(all_results, key=lambda k: all_results[k][1])
best_oof, best_auc = all_results[best_name]

if best_auc > LOGLOSS_OOF_AUC:
    print(f"\nBest variant: {best_name} — retraining on full data...")
    params_map = {
        "A_Lossguide":    {**BASE, "loss_function": "Logloss", "eval_metric": "AUC",
                           "grow_policy": "Lossguide", "max_leaves": 31,
                           "auto_class_weights": "Balanced",
                           "early_stopping_rounds": None},
        "B_CrossEntropy": {**BASE, "loss_function": "CrossEntropy", "eval_metric": "AUC",
                           "class_weights": [1.0, SCALE_POS_WEIGHT],
                           "early_stopping_rounds": None},
        "C_Depth6":       {**BASE, "loss_function": "Logloss", "eval_metric": "AUC",
                           "depth": 6, "l2_leaf_reg": 20.0, "learning_rate": 0.009,
                           "auto_class_weights": "Balanced",
                           "early_stopping_rounds": None},
    }
    m_full = CatBoostClassifier(**params_map[best_name])
    m_full.fit(Pool(X, y, cat_features=cat_idx, feature_names=FEAT))
    v11_test = m_full.predict_proba(
        Pool(X_test, cat_features=cat_idx, feature_names=FEAT))[:,1]
    np.save(f"models/v11_{best_name}_test.npy", v11_test)

    sub_path = f"submissions/v11_{best_name}_oofAUC{best_auc:.4f}.csv"
    make_submission(te_base[ID_COL], v11_test, path=sub_path)
    validate_submission(sub_path)
    print(f"V11 submission: {pathlib.Path(sub_path).name}")

    # Also try ensemble of best V11 variant + V10 seed ensemble
    v10_oof  = np.load("models/v10_seed_ensemble_oof.npy")
    v10_test = np.load("models/v10_seed_ensemble_test.npy")
    w1 = best_auc; w2 = 0.68824
    ens_oof  = (w1*best_oof + w2*v10_oof) / (w1+w2)
    ens_test = (w1*v11_test + w2*v10_test) / (w1+w2)
    ens_auc  = roc_auc_score(y, ens_oof)
    print(f"\nV11 + V10 ensemble OOF AUC: {ens_auc:.5f}")
    if ens_auc > best_auc:
        sub_ens = f"submissions/v11_v10_ensemble_oofAUC{ens_auc:.4f}.csv"
        make_submission(te_base[ID_COL], ens_test, path=sub_ens)
        validate_submission(sub_ens)
        print(f"Ensemble submission: {pathlib.Path(sub_ens).name}")
else:
    print(f"\nNo variant beat Logloss baseline. V10 seed ensemble (Zindi=0.67680) remains best.")
    print("Recommend: proceed to V12 (LightGBM with within-fold target encoding).")

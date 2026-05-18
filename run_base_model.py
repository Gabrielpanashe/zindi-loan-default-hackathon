"""
BASE MODEL — single configurable script for incremental hill climbing.

Change ONE parameter at a time, retrain, compare OOF, submit.
If Zindi improves → update BASE_PARAMS below and continue.
If Zindi does not improve → revert the parameter.

Current best: V10 Zindi=0.67680, V12 OOF=0.68841 (not yet submitted)
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
from src.config import TARGET_COL, ID_COL, RANDOM_SEED
from src.submit import make_submission, validate_submission

# ── SINGLE PLACE TO EDIT — change one param, run, submit, compare ─────────────
VERSION    = "v17"
SEEDS      = [42, 123, 456, 789, 1337, 2024, 9999,
              111, 222, 333, 444, 555, 666, 777]   # keep 14 seeds

BASE_PARAMS = dict(
    depth               = 4,       # confirmed best
    l2_leaf_reg         = 20.0,    # V17 test: reduced from 30 → maybe over-regularised
    learning_rate       = 0.015,   # unchanged
    iterations          = 3000,
    bagging_temperature = 0.29054832752604903,
    random_strength     = 0.14046693632414226,
    border_count        = 128,
    loss_function       = "Logloss",
    eval_metric         = "AUC",
    auto_class_weights  = "Balanced",
    early_stopping_rounds = 150,
    verbose             = 0,
)
# ─────────────────────────────────────────────────────────────────────────────

def build(df_raw, meds=None):
    df = engineer_all_features(df_raw.copy())
    for col in ["collateral_type","employment_sector","loan_purpose",
                "marital_status","province_x_sector","product_x_purpose"]:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
    for c in df.select_dtypes(include="number").columns.difference([TARGET_COL]):
        df[c] = df[c].fillna(meds.get(c, df[c].median()) if meds else df[c].median())
    for c in df.select_dtypes(include="object").columns:
        df[c] = df[c].fillna("Unknown").astype(str)
    df["annual_rate_pct"] = df.groupby("product_code")["annual_rate_pct"].transform(
        lambda x: x.fillna(x.median()))
    df["annual_rate_pct"] = df["annual_rate_pct"].fillna(df["annual_rate_pct"].median())
    for dc in ["date_approved","date_disbursed","first_payment_due","maturity_date","client_dob"]:
        if dc in df.columns: df.drop(columns=[dc], inplace=True)
    return df

print(f"Building features for {VERSION}...")
tr = build(load_train())
meds = tr.select_dtypes(include="number").median().to_dict()
te = build(load_test(), meds)

FEAT = [c for c in tr.columns if c not in [TARGET_COL, ID_COL]]
cats = tr[FEAT].select_dtypes(include="object").columns.tolist()
cidx = [FEAT.index(c) for c in cats]
for c in cats: te[c] = te[c].fillna("Unknown").astype(str)

X = tr[FEAT].values; X_test = te[FEAT].values; y = tr[TARGET_COL].values
folds = load_folds()

print(f"Features: {len(FEAT)}  |  Seeds: {len(SEEDS)}")
print(f"Params: depth={BASE_PARAMS['depth']}  l2={BASE_PARAMS['l2_leaf_reg']}  "
      f"lr={BASE_PARAMS['learning_rate']}  border={BASE_PARAMS['border_count']}")

# ── Seed ensemble ──────────────────────────────────────────────────────────────
all_oof = []; all_test = []; seed_aucs = []
t_total = time.time()

print(f"\n{'='*60}")
print(f"{VERSION}: {len(SEEDS)}-seed ensemble")
print(f"{'='*60}")

for seed in SEEDS:
    seed_oof = np.zeros(len(y))
    for fi, (tri, vali) in enumerate(folds):
        m = CatBoostClassifier(**{**BASE_PARAMS, "random_seed": seed})
        m.fit(Pool(X[tri], y[tri], cat_features=cidx),
              eval_set=Pool(X[vali], y[vali], cat_features=cidx))
        seed_oof[vali] = m.predict_proba(Pool(X[vali], cat_features=cidx))[:,1]

    auc = roc_auc_score(y, seed_oof)
    seed_aucs.append(auc)
    all_oof.append(seed_oof)

    m_full = CatBoostClassifier(**{**BASE_PARAMS, "random_seed": seed,
                                   "early_stopping_rounds": None})
    m_full.fit(Pool(X, y, cat_features=cidx))
    all_test.append(m_full.predict_proba(Pool(X_test, cat_features=cidx))[:,1])

    elapsed = (time.time() - t_total) / 60
    print(f"  Seed {seed:>4}: OOF={auc:.5f}  ({elapsed:.1f} min)")

ens_oof  = np.mean(all_oof,  axis=0)
ens_test = np.mean(all_test, axis=0)
ens_auc  = roc_auc_score(y, ens_oof)

np.save(f"models/{VERSION}_oof.npy",  ens_oof)
np.save(f"models/{VERSION}_test.npy", ens_test)

# ── Submission ─────────────────────────────────────────────────────────────────
sub_path = f"submissions/{VERSION}_depth{BASE_PARAMS['depth']}_seeds{len(SEEDS)}_oofAUC{ens_auc:.4f}.csv"
make_submission(te[ID_COL], ens_test, path=sub_path)
validate_submission(sub_path)

# ── Comparison with previous best ─────────────────────────────────────────────
V12_OOF  = 0.68841
V10_ZINDI = 0.67680

print(f"\n{'='*60}")
print(f"INCREMENTAL RESULTS")
print(f"  V10 (7 seeds, depth=5): OOF=0.68824  Zindi={V10_ZINDI}  BEST ZINDI")
print(f"  V12 (7 seeds, depth=4): OOF={V12_OOF}")
print(f"  {VERSION} ({len(SEEDS)} seeds, depth={BASE_PARAMS['depth']}): "
      f"OOF={ens_auc:.5f}  change={ens_auc-V12_OOF:+.5f}")
print(f"\n  Seed AUCs: {[round(a,5) for a in seed_aucs]}")
print(f"  Total time: {(time.time()-t_total)/60:.1f} min")
print(f"\n  File: {pathlib.Path(sub_path).name}")
print(f"{'='*60}")
print(f"\nNEXT STEPS:")
print(f"  1. Submit {pathlib.Path(sub_path).name} to Zindi")
print(f"  2. If Zindi > {V10_ZINDI}: keep {len(SEEDS)} seeds, try next param change")
print(f"  3. If Zindi <= {V10_ZINDI}: try fewer seeds or different param")
print(f"  4. Edit VERSION and SEEDS/BASE_PARAMS in run_base_model.py and rerun")

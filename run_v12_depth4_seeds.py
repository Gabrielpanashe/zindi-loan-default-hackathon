"""
V12 — Seed ensemble of depth=4 CatBoost (7 seeds).

V11-D showed depth=4 + l2=30 matches V4 locally (OOF=0.68836)
but shallower trees typically generalise better to unseen data.
7-seed ensemble of the shallower model reduces variance further.

Compare against V10 (7 seeds, depth=5) which scored Zindi=0.67680.
If depth=4 generalises better, V12 should beat V10 on Zindi.
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

SEEDS = [42, 123, 456, 789, 1337, 2024, 9999]

# V11-D best params
MODEL_PARAMS = dict(
    depth               = 4,
    l2_leaf_reg         = 30.0,
    learning_rate       = 0.015,
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

# ── Build features ─────────────────────────────────────────────────────────────
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

print("Building features...")
tr = build(load_train())
meds = tr.select_dtypes(include="number").median().to_dict()
te = build(load_test(), meds)

FEAT = [c for c in tr.columns if c not in [TARGET_COL, ID_COL]]
cats = tr[FEAT].select_dtypes(include="object").columns.tolist()
cidx = [FEAT.index(c) for c in cats]
for c in cats: te[c] = te[c].fillna("Unknown").astype(str)

X = tr[FEAT].values; X_test = te[FEAT].values; y = tr[TARGET_COL].values
folds = load_folds()
print(f"Features: {len(FEAT)}  |  Seeds: {SEEDS}\n")

# ── Train one model per seed ───────────────────────────────────────────────────
all_oof  = []
all_test = []
seed_aucs = []
t_total = time.time()

print("="*60)
print(f"V12: depth=4 seed ensemble ({len(SEEDS)} seeds x 5-fold CV)")
print("="*60)

for seed in SEEDS:
    seed_oof = np.zeros(len(y))
    t0 = time.time()
    for fi, (tri, vali) in enumerate(folds):
        m = CatBoostClassifier(**{**MODEL_PARAMS, "random_seed": seed})
        m.fit(Pool(X[tri], y[tri], cat_features=cidx),
              eval_set=Pool(X[vali], y[vali], cat_features=cidx))
        seed_oof[vali] = m.predict_proba(Pool(X[vali], cat_features=cidx))[:,1]

    auc = roc_auc_score(y, seed_oof)
    seed_aucs.append(auc)
    all_oof.append(seed_oof)

    # Full retrain for test predictions
    m_full = CatBoostClassifier(**{**MODEL_PARAMS, "random_seed": seed,
                                   "early_stopping_rounds": None})
    m_full.fit(Pool(X, y, cat_features=cidx))
    all_test.append(m_full.predict_proba(Pool(X_test, cat_features=cidx))[:,1])

    print(f"  Seed {seed:>4}:  OOF AUC={auc:.5f}  "
          f"({(time.time()-t_total)/60:.1f} min elapsed)")

# ── Ensemble ───────────────────────────────────────────────────────────────────
ens_oof  = np.mean(all_oof,  axis=0)
ens_test = np.mean(all_test, axis=0)
ens_auc  = roc_auc_score(y, ens_oof)

np.save("models/v12_depth4_ens_oof.npy",  ens_oof)
np.save("models/v12_depth4_ens_test.npy", ens_test)

print(f"\n  Seed AUCs: {[round(a,5) for a in seed_aucs]}")
print(f"  Mean seed: {np.mean(seed_aucs):.5f}")
print(f"  Ensemble:  {ens_auc:.5f}  (change vs V10: {ens_auc-0.68824:+.5f})")

# ── V12 submission ─────────────────────────────────────────────────────────────
sub_v12 = f"submissions/v12_depth4_seed_ens_oofAUC{ens_auc:.4f}.csv"
make_submission(te[ID_COL], ens_test, path=sub_v12)
validate_submission(sub_v12)

# ── Also ensemble V12 + V10 (depth=4 + depth=5 diversity) ─────────────────────
v10_oof  = np.load("models/v10_seed_ensemble_oof.npy")
v10_test = np.load("models/v10_seed_ensemble_test.npy")
combo_oof  = (ens_oof + v10_oof) / 2
combo_test = (ens_test + v10_test) / 2
combo_auc  = roc_auc_score(y, combo_oof)
print(f"\n  V12 + V10 combo OOF: {combo_auc:.5f}")

sub_combo = f"submissions/v12_v10_depth4_depth5_combo_oofAUC{combo_auc:.4f}.csv"
make_submission(te[ID_COL], combo_test, path=sub_combo)
validate_submission(sub_combo)

print(f"\n{'='*60}")
print(f"V4   depth=5 single seed:   OOF=0.68838  Zindi=0.67556")
print(f"V10  depth=5 seed ensemble: OOF=0.68824  Zindi=0.67680  BEST ZINDI")
print(f"V12  depth=4 seed ensemble: OOF={ens_auc:.5f}  Zindi=???")
print(f"V12+V10 combo:              OOF={combo_auc:.5f}  Zindi=???")
print(f"\nFiles ready:")
print(f"  {pathlib.Path(sub_v12).name}")
print(f"  {pathlib.Path(sub_combo).name}")
print(f"\nTotal time: {(time.time()-t_total)/60:.1f} min")
print(f"{'='*60}")

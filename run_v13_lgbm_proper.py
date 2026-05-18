"""
V13 — LightGBM with within-fold TargetEncoder (no leakage).

Previous LightGBM attempt (V1) used TargetEncoder fitted on FULL training data
— leakage inflated local OOF but hurt Zindi. This version fits the encoder
inside each CV fold's training portion only.

If LightGBM OOF >= 0.685, it is a genuinely different model from CatBoost
and ensemble V13+V12 should push past the 0.677 Zindi ceiling.
"""
import sys, pathlib, warnings, time
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, early_stopping, log_evaluation
from category_encoders import TargetEncoder
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import roc_auc_score

from src.data_loader import load_train, load_test
from src.feature_engineering import engineer_all_features
from src.train import load_folds
from src.config import TARGET_COL, ID_COL, RANDOM_SEED, SCALE_POS_WEIGHT
from src.submit import make_submission, validate_submission

# ── Build base features (no encoding yet) ─────────────────────────────────────
def build(df_raw, meds=None):
    df = engineer_all_features(df_raw.copy())
    # Keep categoricals as strings for encoding inside folds
    for col in ["collateral_type","employment_sector","loan_purpose",
                "marital_status","province_x_sector","product_x_purpose",
                "province","payment_frequency","client_gender",
                "disbursement_channel"]:
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

FEAT     = [c for c in tr.columns if c not in [TARGET_COL, ID_COL]]
cat_cols = tr[FEAT].select_dtypes(include="object").columns.tolist()
num_cols = [c for c in FEAT if c not in cat_cols]

print(f"Features: {len(FEAT)}  |  Categoricals: {len(cat_cols)}  |  Numeric: {len(num_cols)}")

# ── Within-fold encoding function ─────────────────────────────────────────────
def encode_fold(X_tr_df, y_tr, X_val_df, X_te_df=None):
    """
    Fit TargetEncoder on X_tr_df only, apply to val and test.
    Low-cardinality cats get OrdinalEncoder (more stable than TE for 2-4 values).
    """
    high_card = ["province","employment_sector","loan_purpose","collateral_type",
                 "province_x_sector","product_x_purpose"]
    low_card  = [c for c in cat_cols if c not in high_card]

    te_enc = TargetEncoder(cols=high_card, smoothing=10.0)
    te_enc.fit(X_tr_df[high_card], y_tr)

    oe_enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    oe_enc.fit(X_tr_df[low_card].astype(str))

    def transform(df):
        df = df.copy()
        df[high_card] = te_enc.transform(df[high_card])
        df[low_card]  = oe_enc.transform(df[low_card].astype(str))
        return df.values.astype(np.float32)

    X_tr_enc  = transform(X_tr_df)
    X_val_enc = transform(X_val_df)
    X_te_enc  = transform(X_te_df) if X_te_df is not None else None
    return X_tr_enc, X_val_enc, X_te_enc

# ── LightGBM params ────────────────────────────────────────────────────────────
lgbm_params = dict(
    objective        = "binary",
    metric           = "auc",
    n_estimators     = 4000,
    learning_rate    = 0.02,
    num_leaves       = 63,
    min_child_samples= 40,
    subsample        = 0.75,
    subsample_freq   = 1,
    colsample_bytree = 0.70,
    reg_alpha        = 0.1,
    reg_lambda       = 10.0,
    scale_pos_weight = SCALE_POS_WEIGHT,
    n_jobs           = -1,
    random_state     = RANDOM_SEED,
    verbose          = -1,
)

folds = load_folds()
X_df  = tr[FEAT]
X_te_df = te[FEAT]
y     = tr[TARGET_COL].values

oof   = np.zeros(len(y))
te_preds_folds = []
cv_aucs = []
t0 = time.time()

print("\n" + "="*60)
print("V13: LightGBM + within-fold TargetEncoder (5-fold CV)")
print("="*60)

for fi, (tri, vali) in enumerate(folds):
    X_tr_enc, X_val_enc, _ = encode_fold(
        X_df.iloc[tri], y[tri], X_df.iloc[vali])

    m = LGBMClassifier(**lgbm_params)
    m.fit(X_tr_enc, y[tri],
          eval_set=[(X_val_enc, y[vali])],
          callbacks=[early_stopping(100, verbose=False),
                     log_evaluation(period=0)])

    p = m.predict_proba(X_val_enc)[:,1]
    oof[vali] = p
    fa = roc_auc_score(y[vali], p)
    cv_aucs.append(fa)
    print(f"  Fold {fi+1}/5  AUC:{fa:.5f}  (iter:{m.best_iteration_})")

oof_auc = roc_auc_score(y, oof)
print(f"\n  CV AUC:  {np.mean(cv_aucs):.5f} +/- {np.std(cv_aucs):.5f}")
print(f"  OOF AUC: {oof_auc:.5f}  ({(time.time()-t0)/60:.1f} min)")
np.save("models/v13_lgbm_oof.npy", oof)

# ── Full retrain for test predictions ─────────────────────────────────────────
print("\nFull retrain on all data...")
X_tr_full, _, X_te_full = encode_fold(X_df, y, X_df, X_te_df)
m_full = LGBMClassifier(**{**lgbm_params, "n_estimators": 4000})
m_full.fit(X_tr_full, y, callbacks=[log_evaluation(period=0)])
v13_test = m_full.predict_proba(X_te_full)[:,1]
np.save("models/v13_lgbm_test.npy", v13_test)

# Feature importance
imp = pd.DataFrame({"feature": FEAT,
                    "importance": m_full.feature_importances_}
                   ).sort_values("importance", ascending=False)
print("\nTop 15 features (LightGBM):")
print(imp.head(15).to_string(index=False))

# ── V13 submission ─────────────────────────────────────────────────────────────
sub_v13 = f"submissions/v13_lgbm_infold_oofAUC{oof_auc:.4f}.csv"
make_submission(te[ID_COL], v13_test, path=sub_v13)
validate_submission(sub_v13)

# ── Ensemble V13 + V12 (LGBM + CatBoost depth=4) ──────────────────────────────
v12_oof  = np.load("models/v12_depth4_ens_oof.npy")
v12_test = np.load("models/v12_depth4_ens_test.npy")

w_lgbm = oof_auc
w_cb   = 0.68841
total  = w_lgbm + w_cb
ens_oof  = (w_lgbm*oof + w_cb*v12_oof) / total
ens_test = (w_lgbm*v13_test + w_cb*v12_test) / total
ens_auc  = roc_auc_score(y, ens_oof)
print(f"\n  LGBM+CatBoost(depth=4) ensemble OOF: {ens_auc:.5f}")

# Also try with V10
v10_oof  = np.load("models/v10_seed_ensemble_oof.npy")
v10_test = np.load("models/v10_seed_ensemble_test.npy")
tri_oof  = (oof + v12_oof + v10_oof) / 3
tri_test = (v13_test + v12_test + v10_test) / 3
tri_auc  = roc_auc_score(y, tri_oof)
print(f"  LGBM+V12+V10 3-way OOF:              {tri_auc:.5f}")

np.save("models/v13_v12_ens_test.npy", ens_test)

sub_ens = f"submissions/v13_lgbm_v12_cb_ensemble_oofAUC{ens_auc:.4f}.csv"
make_submission(te[ID_COL], ens_test, path=sub_ens)
validate_submission(sub_ens)

if tri_auc > ens_auc:
    sub_tri = f"submissions/v13_v12_v10_3way_oofAUC{tri_auc:.4f}.csv"
    make_submission(te[ID_COL], tri_test, path=sub_tri)
    validate_submission(sub_tri)
    print(f"  3-way submission: {pathlib.Path(sub_tri).name}")

print(f"\n{'='*60}")
print(f"RESULTS")
print(f"  V10  CatBoost depth=5 seeds: OOF=0.68824  Zindi=0.67680  BEST")
print(f"  V12  CatBoost depth=4 seeds: OOF=0.68841  Zindi=???")
print(f"  V13  LightGBM in-fold enc:   OOF={oof_auc:.5f}  Zindi=???")
print(f"  V13+V12 ensemble:             OOF={ens_auc:.5f}  Zindi=???")
print(f"  V13+V12+V10 3-way:            OOF={tri_auc:.5f}  Zindi=???")
print(f"\nIf V13 OOF >= 0.685: LGBM is competitive, ensemble will help on Zindi")
print(f"If V13 OOF < 0.683:  LGBM encoding still has issues, stick with CatBoost")
print(f"{'='*60}")

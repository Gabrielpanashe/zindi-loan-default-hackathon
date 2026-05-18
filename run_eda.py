"""EDA script — runs from project root, prints all findings needed to update config."""
import sys
import pathlib
import warnings
warnings.filterwarnings("ignore")

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from src.data_loader import load_train, load_test
from src.woe_iv import compute_woe_iv, iv_summary

pd.set_option("display.max_columns", 50)
pd.set_option("display.width", 120)

print("=" * 70)
print("LOADING DATA")
print("=" * 70)
train = load_train()
test  = load_test()
print(f"Train: {train.shape}  |  Test: {test.shape}")
print(f"Columns: {list(train.columns)}\n")

# ── 1. Target Distribution ─────────────────────────────────────────────────────
print("=" * 70)
print("1. TARGET DISTRIBUTION")
print("=" * 70)
counts = train["Target"].value_counts()
print(counts)
print(f"Default rate:     {counts[1]/len(train)*100:.2f}%")
print(f"Non-default rate: {counts[0]/len(train)*100:.2f}%")
print(f"Imbalance ratio:  {counts[0]/counts[1]:.3f}:1\n")

# ── 2. Missing Values ──────────────────────────────────────────────────────────
print("=" * 70)
print("2. MISSING VALUES (sorted by % missing)")
print("=" * 70)
missing = (train.isna().sum() / len(train) * 100).sort_values(ascending=False)
print(missing[missing > 0].round(2).to_string())
print()

# ── 3. Default Rate by Categorical ────────────────────────────────────────────
cat_cols = ["product_code","payment_frequency","loan_purpose","client_gender",
            "marital_status","employment_sector","collateral_type",
            "disbursement_channel","province"]

print("=" * 70)
print("3. DEFAULT RATE BY CATEGORICAL FEATURE")
print("=" * 70)
overall_rate = train["Target"].mean()
print(f"Overall default rate: {overall_rate*100:.2f}%\n")

province_rates = {}
sector_rates   = {}
collateral_rates = {}

for col in cat_cols:
    rates = (train.groupby(col, dropna=False)["Target"]
             .agg(["mean","count"])
             .rename(columns={"mean":"default_rate","count":"n"})
             .sort_values("default_rate", ascending=False))
    rates["default_pct"] = (rates["default_rate"] * 100).round(2)
    print(f"--- {col} ---")
    print(rates[["default_pct","n"]].to_string())
    print()

    if col == "province":
        province_rates = rates["default_rate"].to_dict()
    if col == "employment_sector":
        sector_rates = rates["default_rate"].to_dict()
    if col == "collateral_type":
        collateral_rates = rates["default_rate"].to_dict()

# ── 4. Numeric Feature Summary by Target ──────────────────────────────────────
print("=" * 70)
print("4. NUMERIC FEATURES — MEAN BY TARGET")
print("=" * 70)
num_cols = ["amount_usd","annual_rate_pct","term_months","monthly_income_usd",
            "existing_obligations","num_dependents","months_at_employer"]
print(train.groupby("Target")[num_cols].mean().round(2).T.to_string())
print()

# ── 5. Correlation with Target ────────────────────────────────────────────────
print("=" * 70)
print("5. CORRELATION WITH TARGET (numeric only)")
print("=" * 70)
corr = train[num_cols + ["Target"]].corr()["Target"].drop("Target").sort_values()
print(corr.round(4).to_string())
print()

# ── 6. annual_rate_pct Distribution (bimodal check) ───────────────────────────
print("=" * 70)
print("6. annual_rate_pct DISTRIBUTION (find MFI vs bank split)")
print("=" * 70)
rate = train["annual_rate_pct"].dropna()
print(f"Min:    {rate.min():.2f}%")
print(f"Max:    {rate.max():.2f}%")
print(f"Mean:   {rate.mean():.2f}%")
print(f"Median: {rate.median():.2f}%")
print("\nPercentile breakdown:")
for p in [5,10,20,25,30,40,50,60,70,75,80,90,95]:
    print(f"  p{p:02d}: {rate.quantile(p/100):.2f}%")
# Find the valley between the two humps
hist_vals, bin_edges = np.histogram(rate, bins=50)
valley_idx = np.argmin(hist_vals[5:35]) + 5
valley_point = (bin_edges[valley_idx] + bin_edges[valley_idx+1]) / 2
print(f"\nEstimated bank/MFI split point: {valley_point:.1f}%")
print(f"  Loans below {valley_point:.0f}%: {(rate < valley_point).sum()} ({(rate < valley_point).mean()*100:.1f}%)")
print(f"  Loans above {valley_point:.0f}%: {(rate >= valley_point).sum()} ({(rate >= valley_point).mean()*100:.1f}%)")
print()

# ── 7. Data Quality Checks ────────────────────────────────────────────────────
print("=" * 70)
print("7. DATA QUALITY CHECKS")
print("=" * 70)
print(f"Duplicate rows:  {train.duplicated().sum()}")
print(f"Duplicate IDs:   {train['ID'].duplicated().sum()}")

import re
bad_ids = train["ID"][~train["ID"].str.match(r'^[A-Z]{2}\d{5}$', na=False)]
print(f"Invalid ID format: {len(bad_ids)}")
if len(bad_ids) > 0:
    print(f"  Examples: {list(bad_ids.head(5))}")

print("\nDate logic violations:")
print(f"  disbursed < approved:           {(train.date_disbursed < train.date_approved).sum()}")
print(f"  first_payment < disbursed:      {(train.first_payment_due < train.date_disbursed).sum()}")
print(f"  maturity < first_payment:       {(train.maturity_date < train.first_payment_due).sum()}")
try:
    under18 = train.client_dob > (train.date_approved - pd.DateOffset(years=18))
    print(f"  borrower under 18 at approval:  {under18.sum()}")
except:
    print("  (could not check age — date parsing issue)")

print("\nOutliers (IQR method):")
for col in ["amount_usd","annual_rate_pct","monthly_income_usd","term_months"]:
    q1, q3 = train[col].quantile(0.25), train[col].quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5*iqr, q3 + 1.5*iqr
    n = ((train[col] < lo) | (train[col] > q3 + 1.5*iqr)).sum()
    print(f"  {col}: {n} outliers  (valid range: {lo:.1f} – {hi:.1f})")

print("\nTrain/Test distribution drift (KS test):")
for col in ["amount_usd","annual_rate_pct","term_months","monthly_income_usd","existing_obligations"]:
    stat, p = stats.ks_2samp(train[col].dropna(), test[col].dropna())
    flag = "  *** DRIFT ***" if p < 0.05 else ""
    print(f"  {col}: p={p:.4f}{flag}")
print()

# ── 8. WoE / IV Analysis ──────────────────────────────────────────────────────
print("=" * 70)
print("8. WEIGHT OF EVIDENCE / INFORMATION VALUE (all features)")
print("=" * 70)
all_features = num_cols + cat_cols
cat_features = cat_cols

iv_df = iv_summary(train, all_features, "Target", cat_features=cat_features)
print(iv_df.to_string())
print()

to_drop = iv_df[iv_df["iv"] < 0.02]["feature"].tolist()
print(f"Features IV < 0.02 (drop candidates): {to_drop}")

suspicious = iv_df[iv_df["iv"] > 0.5]["feature"].tolist()
if suspicious:
    print(f"Features IV > 0.5 (LEAKAGE CHECK): {suspicious}")
print()

# ── 9. WoE detail for top features ────────────────────────────────────────────
print("=" * 70)
print("9. WoE DETAIL — TOP 5 FEATURES")
print("=" * 70)
for _, row in iv_df.head(5).iterrows():
    feat = row["feature"]
    is_cat = feat in cat_cols
    woe_df, iv = compute_woe_iv(train, feat, "Target", cat=is_cat)
    print(f"\n{feat}  (IV={iv:.4f}  |  {row['predictive_power']})")
    print(woe_df[["bin","n_events","n_non_events","woe"]].to_string(index=False))

# ── 10. Key numbers for config update ────────────────────────────────────────
print("\n" + "=" * 70)
print("10. SUMMARY — COPY THESE VALUES INTO config/feature_engineering")
print("=" * 70)
high_risk = {k: v for k, v in province_rates.items()
             if v > overall_rate and str(k) != "nan"}
low_risk  = {k: v for k, v in province_rates.items()
             if v <= overall_rate and str(k) != "nan"}
print(f"\nHIGH-RISK provinces (default rate > {overall_rate*100:.1f}%):")
for p, r in sorted(high_risk.items(), key=lambda x: -x[1]):
    print(f"  '{p}': {r*100:.2f}%")
print(f"\nLOW-RISK provinces:")
for p, r in sorted(low_risk.items(), key=lambda x: -x[1]):
    print(f"  '{p}': {r*100:.2f}%")

print(f"\nHIGH-RISK employment sectors (default rate > {overall_rate*100:.1f}%):")
for s, r in sorted(sector_rates.items(), key=lambda x: -x[1]):
    flag = " ← HIGH" if r > overall_rate else ""
    if str(s) != "nan":
        print(f"  '{s}': {r*100:.2f}%{flag}")

print(f"\nMFI rate split point: ~{valley_point:.0f}%")
print(f"SCALE_POS_WEIGHT = {counts[0]}/{counts[1]} = {counts[0]/counts[1]:.4f}")

print("\n" + "=" * 70)
print("EDA COMPLETE")
print("=" * 70)

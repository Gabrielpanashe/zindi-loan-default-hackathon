from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent
DATA_RAW     = ROOT / "data" / "raw"
DATA_PROC    = ROOT / "data" / "processed"
MODELS_DIR   = ROOT / "models"
SUBMISSIONS  = ROOT / "submissions"
REPORTS      = ROOT / "reports"

TRAIN_CSV    = DATA_RAW / "Train.csv"
TEST_CSV     = DATA_RAW / "Test.csv"
SAMPLE_SUB   = DATA_RAW / "SampleSubmission.csv"
VAR_DEFS     = DATA_RAW / "VariableDefinitions.csv"

TRAIN_FEATS  = DATA_PROC / "train_features.parquet"
TEST_FEATS   = DATA_PROC / "test_features.parquet"
FOLD_IDX     = DATA_PROC / "fold_indices.pkl"

# ── Reproducibility ────────────────────────────────────────────────────────────
RANDOM_SEED  = 42
N_FOLDS      = 5

# ── Column names ───────────────────────────────────────────────────────────────
TARGET_COL   = "Target"
ID_COL       = "ID"

DATE_COLS = [
    "date_approved",
    "date_disbursed",
    "first_payment_due",
    "maturity_date",
    "client_dob",
]

NUM_COLS = [
    "amount_usd",
    "annual_rate_pct",
    "term_months",
    "monthly_income_usd",
    "existing_obligations",
    "num_dependents",
    "months_at_employer",
]

CAT_COLS = [
    "product_code",
    "payment_frequency",
    "loan_purpose",
    "client_gender",
    "marital_status",
    "employment_sector",
    "collateral_type",
    "disbursement_channel",
    "province",
]

# Categorical columns with high cardinality — use TargetEncoder
HIGH_CARD_CATS = ["province", "employment_sector", "loan_purpose", "collateral_type"]

# Categorical columns with low cardinality — use OrdinalEncoder
LOW_CARD_CATS = ["client_gender", "payment_frequency", "marital_status",
                 "disbursement_channel", "product_code"]

# Columns with missing values and their rates (from EDA)
MISSING_COLS = {
    "collateral_type":    0.318,
    "monthly_income_usd": 0.080,
    "num_dependents":     0.060,
    "months_at_employer": 0.050,
    "employment_sector":  0.030,
    "loan_purpose":       0.020,
    "marital_status":     0.015,
    "annual_rate_pct":    0.010,
}

# Class counts in training set (for scale_pos_weight)
N_NON_DEFAULT = 29542
N_DEFAULT     = 9390
SCALE_POS_WEIGHT = N_NON_DEFAULT / N_DEFAULT  # ≈ 3.14

# Zimbabwe provinces — urban vs rural split
URBAN_PROVINCES = ["Harare", "Bulawayo"]
RURAL_PROVINCES = [
    "Manicaland", "Mashonaland_West", "Mashonaland_East",
    "Mashonaland_Central", "Midlands", "Masvingo",
    "Matabeleland_South", "Matabeleland_North",
]

# EDA findings (May 11 2026) — confirmed default rates
# High-risk provinces (above 24.12% national average)
HIGH_RISK_PROVINCES = [
    "Matabeleland_South",  # 28.60%
    "Matabeleland_North",  # 26.33%
    "Masvingo",            # 24.78%
    "Mashonaland_East",    # 24.69%
    "Mashonaland_West",    # 24.59%
]

# Low-risk employment sectors (well below 24.12% average)
LOW_RISK_SECTORS = ["Government", "Finance", "NGO", "Telecom", "Mining"]

# Loan purposes with high default rates (from EDA)
HIGH_RISK_PURPOSES = [
    "Funeral",             # 31.05%
    "Livestock",           # 27.26%
    "Business_Expansion",  # 26.26%
    "Working_Capital",     # 26.02%
    "Stock_Purchase",      # 25.38%
    "Farming_Inputs",      # 25.34%
]
LOW_RISK_PURPOSES = [
    "School_Fees",         # 17.07%
    "Debt_Consolidation",  # 17.29%
    "Medical",             # 22.05%
    "Personal",            # 22.65%
    "Rent",                # 22.99%
]

# MFI rate threshold — confirmed by WoE table: WoE turns positive above ~80.83%
MFI_RATE_THRESHOLD  = 80.0
BANK_RATE_THRESHOLD = 18.0

# NOTE: client_dob is 100% missing — do not use for age calculation

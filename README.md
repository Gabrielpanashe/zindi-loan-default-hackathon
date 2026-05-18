# AI for Financial Inclusion — Loan Default Prediction
## IndabaX Zimbabwe 2026 Hackathon

**Challenge:** Predicting loan defaults in Zimbabwe's banking sector  
**Platform:** Zindi  
**Metric:** ROC-AUC (primary)  
**Team:** Panashe (Lead), Member 2, Member 3  
**Current Best AUC:** 0.6451 (baseline — to be updated)

---

## Setup

```bash
pip install -r requirements.txt
```

> **Data:** Raw CSV files are NOT in git. Get them from the shared Google Drive folder and place them in `data/raw/`.

---

## Project Structure

```
zindi_loan_default_heckathon/
├── data/
│   ├── raw/              ← Train.csv, Test.csv, SampleSubmission.csv (gitignored)
│   └── processed/        ← Generated parquet files (gitignored)
├── notebooks/
│   ├── reference/        ← Original starter notebook (read-only)
│   ├── 01_eda_woe_iv.ipynb
│   ├── 02_preprocessing.ipynb
│   ├── 03_feature_engineering.ipynb
│   ├── 04_baseline_logreg.ipynb
│   ├── 05_advanced_models.ipynb
│   ├── 06_tuning_ensemble.ipynb
│   └── 07_final_submission.ipynb
├── src/                  ← Reusable Python modules (all shared logic lives here)
├── submissions/          ← Submission CSVs tracked in git
├── models/               ← Saved model artifacts (gitignored)
├── reports/figures/      ← EDA plots
└── tests/                ← Submission format validation
```

---

## Reproduce Results

```bash
# 1. Build processed features
python -c "from src.preprocessing import fit_transform_save; fit_transform_save()"

# 2. Train LightGBM with 5-fold CV
python src/train.py

# 3. Generate submission
python src/submit.py submissions/FINAL_submission.csv
```

---

## Validate a Submission File

```bash
python tests/test_submission_format.py submissions/<your_file>.csv
```

---

## Notebook Commit Rule

Always clear notebook outputs before committing:

```bash
jupyter nbconvert --ClearOutputPreprocessor.enabled=True --to notebook --inplace notebooks/<notebook>.ipynb
```

---

## Submission Log

| File | Local AUC | Zindi Public AUC | Date | Notes |
|------|-----------|-----------------|------|-------|
| baseline_logreg_20260510.csv | 0.6451 | — | May 10 | Starter notebook reproduction |

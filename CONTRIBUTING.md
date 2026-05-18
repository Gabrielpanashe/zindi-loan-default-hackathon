# Contributing Guide

## Branch Naming

```
<your-name>/<short-description>
```

Examples:
- `panashe/lgbm-tuning`
- `member2/date-features`
- `member3/streamlit-ui`

## Branches

| Member | Branch prefix | Areas |
|--------|--------------|-------|
| Panashe | `panashe/` | EDA, advanced models, ensemble, Zindi submissions |
| Member 2 | `member2/` | Preprocessing pipeline, feature engineering |
| Member 3 | `member3/` | Baseline benchmark, tests |

## Rules

1. **Never commit directly to `main`.** Always work on a branch and open a PR.
2. **Panashe merges all PRs** — open a PR and request review.
3. **PR title format:** `[PHASE-N] Description (Your Name)`  
   Example: `[PHASE-2] Add iterative imputer for numeric missing values (Member 2)`
4. **Every PR must pass the submission format test** before merging (if it touches prediction code):  
   `python tests/test_submission_format.py submissions/<file>.csv`
5. **Clear notebook outputs before committing:**  
   `jupyter nbconvert --ClearOutputPreprocessor.enabled=True --to notebook --inplace notebooks/<notebook>.ipynb`
6. **Shared logic lives in `src/`** — heavy code never lives inside a notebook cell.  
   Notebooks call `src/` functions; they do not implement them.
7. **Use the shared fold indices** at `data/processed/fold_indices.pkl` for ALL model validation.  
   Never regenerate folds independently — this ensures fair model comparison.

## Notebook Ownership

Each notebook has one owner. Do not edit another person's notebook.

| Notebook | Owner |
|----------|-------|
| 01_eda_woe_iv.ipynb | Panashe |
| 02_preprocessing.ipynb | Member 2 |
| 03_feature_engineering.ipynb | All (coordinate in chat first) |
| 04_baseline_logreg.ipynb | Member 3 |
| 05_advanced_models.ipynb | Panashe |
| 06_tuning_ensemble.ipynb | Panashe |
| 07_final_submission.ipynb | Panashe |

## Data Sharing

Raw CSVs are gitignored. Share via Google Drive — do NOT commit them.  
After cloning the repo, place the files in `data/raw/`:
- `Train.csv`
- `Test.csv`
- `SampleSubmission.csv`
- `VariableDefinitions.csv`

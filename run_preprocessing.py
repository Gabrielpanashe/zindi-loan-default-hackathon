"""Run preprocessing pipeline and create shared fold indices."""
import sys, pathlib, warnings, pickle
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

from src.data_loader import load_train, load_test
from src.preprocessing import fit_transform_save
from src.train import create_and_save_folds
from src.config import TARGET_COL, ID_COL

print("Loading raw data...")
train = load_train()
test  = load_test()
print(f"Train: {train.shape}  |  Test: {test.shape}")

print("\nRunning preprocessing pipeline (IterativeImputer — takes ~2 min)...")
train_proc, test_proc = fit_transform_save(train, test, impute_numeric=True)

print(f"\nProcessed train shape: {train_proc.shape}")
print(f"Processed test shape:  {test_proc.shape}")
print(f"NaN in processed train: {train_proc.isna().sum().sum()}")
print(f"NaN in processed test:  {test_proc.isna().sum().sum()}")

print("\nCreating shared stratified fold indices...")
X = train_proc.drop(columns=[TARGET_COL, ID_COL])
y = train_proc[TARGET_COL]
folds = create_and_save_folds(X, y)
print(f"Created {len(folds)} folds")

# Verify fold class balance
import numpy as np
y_arr = y.values
for i, (tr_idx, val_idx) in enumerate(folds):
    val_rate = y_arr[val_idx].mean()
    print(f"  Fold {i+1}: val_size={len(val_idx):,}  default_rate={val_rate*100:.2f}%")

print("\nFeature list saved to data/processed/:")
feat_cols = [c for c in train_proc.columns if c not in [TARGET_COL, ID_COL]]
print(f"  {len(feat_cols)} features total")
print(f"  Features: {feat_cols}")

print("\nPREPROCESSING COMPLETE")

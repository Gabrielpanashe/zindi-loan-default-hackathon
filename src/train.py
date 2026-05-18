"""
Training utilities — stratified K-fold cross-validation with SMOTE.

The shared fold indices at data/processed/fold_indices.pkl ensure every
team member evaluates models on identical splits for fair comparison.
"""

import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score
from imblearn.over_sampling import SMOTE

from src.config import N_FOLDS, RANDOM_SEED, FOLD_IDX, DATA_PROC, TARGET_COL, ID_COL


def create_and_save_folds(X: pd.DataFrame, y: pd.Series) -> list:
    """
    Generate stratified K-fold indices and save to data/processed/fold_indices.pkl.
    Run ONCE by the team leader; all members load these same indices.
    """
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    folds = list(skf.split(X, y))
    DATA_PROC.mkdir(parents=True, exist_ok=True)
    with open(FOLD_IDX, "wb") as f:
        pickle.dump(folds, f)
    print(f"Saved {N_FOLDS} stratified folds -> {FOLD_IDX}")
    return folds


def load_folds() -> list:
    with open(FOLD_IDX, "rb") as f:
        return pickle.load(f)


def cross_validate_model(
    model,
    X: np.ndarray | pd.DataFrame,
    y: np.ndarray | pd.Series,
    folds: list,
    use_smote: bool = False,
    early_stopping_rounds: int = 100,
    eval_set_verbose: bool = False,
    cat_features: list | None = None,
) -> dict:
    """
    Run stratified K-fold cross-validation.

    Parameters
    ----------
    model               : unfitted model (will be cloned per fold)
    X                   : feature matrix
    y                   : binary target
    folds               : list of (train_idx, val_idx) from load_folds()
    use_smote           : apply SMOTE to each training fold only
    early_stopping_rounds: for gradient boosters (ignored for sklearn models)
    cat_features        : CatBoost only — list of categorical feature indices/names

    Returns
    -------
    dict with keys: oof_preds, test_preds (None here), cv_aucs, mean_auc, std_auc
    """
    import copy
    X = np.array(X) if isinstance(X, pd.DataFrame) else X
    y = np.array(y) if isinstance(y, pd.Series) else y

    oof_preds = np.zeros(len(y))
    cv_aucs   = []

    for fold_idx, (train_idx, val_idx) in enumerate(folds):
        X_tr, y_tr = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]

        if use_smote:
            smote = SMOTE(random_state=RANDOM_SEED, k_neighbors=5)
            X_tr, y_tr = smote.fit_resample(X_tr, y_tr)

        fold_model = copy.deepcopy(model)

        # Handle gradient boosters that support early stopping
        model_name = type(fold_model).__name__.lower()
        if "lgbm" in model_name or "lightgbm" in model_name:
            fold_model.fit(
                X_tr, y_tr,
                eval_set=[(X_val, y_val)],
                callbacks=_lgbm_early_stop(early_stopping_rounds, eval_set_verbose),
            )
        elif "xgb" in model_name:
            fold_model.fit(
                X_tr, y_tr,
                eval_set=[(X_val, y_val)],
                verbose=eval_set_verbose,
            )
        elif "catboost" in model_name:
            fit_kwargs = dict(eval_set=(X_val, y_val), verbose=100 if eval_set_verbose else 0)
            if cat_features is not None:
                fit_kwargs["cat_features"] = cat_features
            fold_model.fit(X_tr, y_tr, **fit_kwargs)
        else:
            fold_model.fit(X_tr, y_tr)

        val_preds = fold_model.predict_proba(X_val)[:, 1]
        oof_preds[val_idx] = val_preds

        fold_auc = roc_auc_score(y_val, val_preds)
        cv_aucs.append(fold_auc)
        print(f"  Fold {fold_idx + 1}/{len(folds)} — AUC: {fold_auc:.5f}")

    mean_auc = np.mean(cv_aucs)
    std_auc  = np.std(cv_aucs)
    oof_auc  = roc_auc_score(y, oof_preds)
    print(f"\n  CV AUC:  {mean_auc:.5f} ± {std_auc:.5f}")
    print(f"  OOF AUC: {oof_auc:.5f}")

    return {
        "oof_preds": oof_preds,
        "cv_aucs":   cv_aucs,
        "mean_auc":  mean_auc,
        "std_auc":   std_auc,
        "oof_auc":   oof_auc,
    }


def train_full(model, X, y, cat_features=None):
    """Train a model on the full dataset (call after CV to generate test predictions)."""
    fit_kwargs = {}
    if cat_features is not None and "catboost" in type(model).__name__.lower():
        fit_kwargs["cat_features"] = cat_features
    model.fit(X, y, **fit_kwargs)
    return model


def _lgbm_early_stop(rounds, verbose):
    from lightgbm import early_stopping, log_evaluation
    return [early_stopping(rounds, verbose=False), log_evaluation(period=100 if verbose else 0)]

"""
Model factory — returns configured model instances ready for training.
All defaults are starting points; tune via Optuna in notebook 06.
"""

from src.config import RANDOM_SEED, SCALE_POS_WEIGHT
from sklearn.linear_model import LogisticRegression


def get_logreg(**kwargs) -> LogisticRegression:
    """Logistic Regression — baseline / WoE scorecard / stacking meta-learner."""
    defaults = dict(
        C=1.0,
        class_weight="balanced",
        solver="liblinear",
        max_iter=1000,
        random_state=RANDOM_SEED,
    )
    defaults.update(kwargs)
    return LogisticRegression(**defaults)


def get_lgbm(**kwargs):
    from lightgbm import LGBMClassifier
    defaults = dict(
        objective="binary",
        metric="auc",
        n_estimators=2000,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=50,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        is_unbalance=True,
        n_jobs=-1,
        random_state=RANDOM_SEED,
        verbose=-1,
    )
    defaults.update(kwargs)
    return LGBMClassifier(**defaults)


def get_xgb(**kwargs):
    from xgboost import XGBClassifier
    defaults = dict(
        objective="binary:logistic",
        eval_metric="auc",
        n_estimators=2000,
        learning_rate=0.05,
        max_depth=6,
        min_child_weight=10,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=SCALE_POS_WEIGHT,
        tree_method="hist",
        n_jobs=-1,
        random_state=RANDOM_SEED,
    )
    defaults.update(kwargs)
    return XGBClassifier(**defaults)


def get_catboost(**kwargs):
    from catboost import CatBoostClassifier
    defaults = dict(
        iterations=2000,
        learning_rate=0.05,
        depth=6,
        loss_function="Logloss",
        eval_metric="AUC",
        auto_class_weights="Balanced",
        early_stopping_rounds=100,
        random_seed=RANDOM_SEED,
        verbose=100,
    )
    defaults.update(kwargs)
    return CatBoostClassifier(**defaults)

"""
Evaluation utilities — metrics, threshold tuning, ROC plots, feature importance.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    roc_auc_score, accuracy_score, precision_score,
    recall_score, f1_score, roc_curve, confusion_matrix,
)


def compute_metrics(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    threshold: float = 0.5,
) -> dict:
    y_pred = (y_pred_proba >= threshold).astype(int)
    return {
        "roc_auc":   round(roc_auc_score(y_true, y_pred_proba), 5),
        "accuracy":  round(accuracy_score(y_true, y_pred), 5),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 5),
        "recall":    round(recall_score(y_true, y_pred, zero_division=0), 5),
        "f1":        round(f1_score(y_true, y_pred, zero_division=0), 5),
        "threshold": threshold,
    }


def find_optimal_threshold(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    metric: str = "f1",
) -> float:
    """
    Search for the threshold that maximises the chosen metric on OOF predictions.
    Use this on out-of-fold predictions, then apply the threshold to test predictions.

    Parameters
    ----------
    metric : one of 'f1', 'recall', 'precision', 'balanced_accuracy'
    """
    thresholds = np.linspace(0.1, 0.9, 81)
    best_t, best_score = 0.5, -1.0

    for t in thresholds:
        y_pred = (y_pred_proba >= t).astype(int)
        if metric == "f1":
            score = f1_score(y_true, y_pred, zero_division=0)
        elif metric == "recall":
            score = recall_score(y_true, y_pred, zero_division=0)
        elif metric == "precision":
            score = precision_score(y_true, y_pred, zero_division=0)
        else:
            raise ValueError(f"Unknown metric: {metric}")

        if score > best_score:
            best_score, best_t = score, t

    print(f"Optimal threshold ({metric}): {best_t:.2f}  →  score: {best_score:.4f}")
    return best_t


def plot_roc_curve(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    label: str = "Model",
    ax=None,
) -> None:
    fpr, tpr, _ = roc_curve(y_true, y_pred_proba)
    auc = roc_auc_score(y_true, y_pred_proba)
    if ax is None:
        _, ax = plt.subplots(figsize=(7, 5))
    ax.plot(fpr, tpr, label=f"{label} (AUC={auc:.4f})")
    ax.plot([0, 1], [0, 1], "k--", linewidth=0.8)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve")
    ax.legend()
    plt.tight_layout()


def plot_feature_importance(
    model,
    feature_names: list[str],
    top_n: int = 25,
    title: str = "Feature Importance",
) -> None:
    """Works with LightGBM, XGBoost, CatBoost, and sklearn tree-based models."""
    model_name = type(model).__name__.lower()

    if "lgbm" in model_name or "lightgbm" in model_name:
        importances = model.feature_importances_
    elif "xgb" in model_name:
        importances = model.feature_importances_
    elif "catboost" in model_name:
        importances = model.get_feature_importance()
    else:
        importances = model.feature_importances_

    df = pd.DataFrame({"feature": feature_names, "importance": importances})
    df = df.sort_values("importance", ascending=False).head(top_n)

    _, ax = plt.subplots(figsize=(8, top_n * 0.35 + 1))
    ax.barh(df["feature"][::-1], df["importance"][::-1], color="#4575b4")
    ax.set_title(title)
    ax.set_xlabel("Importance")
    plt.tight_layout()
    plt.show()


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    threshold: float = 0.5,
) -> None:
    y_pred = (y_pred_proba >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    _, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(["No Default", "Default"])
    ax.set_yticklabels(["No Default", "Default"])
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix (threshold={threshold})")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    plt.colorbar(im)
    plt.tight_layout()
    plt.show()

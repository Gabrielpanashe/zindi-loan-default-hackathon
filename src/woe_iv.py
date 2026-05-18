"""
Weight of Evidence (WoE) and Information Value (IV) utilities.

WoE for a bin i:
    WoE_i = ln( P(Events in i) / P(Non-Events in i) )

IV for a feature:
    IV = Σ_i  (P(Events in i) - P(Non-Events in i)) * WoE_i

IV thresholds (standard credit-risk convention):
    < 0.02  → useless, drop
    0.02–0.1 → weak
    0.1–0.3  → medium
    0.3–0.5  → strong
    > 0.5   → suspicious — check for data leakage
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


def compute_woe_iv(
    df: pd.DataFrame,
    feature: str,
    target: str,
    bins: int = 10,
    cat: bool = False,
    min_bin_size: float = 0.01,
) -> tuple[pd.DataFrame, float]:
    """
    Compute WoE per bin/category and the overall IV for a single feature.

    Parameters
    ----------
    df          : DataFrame containing feature and target columns
    feature     : column name of the feature to analyse
    target      : column name of the binary target (0/1)
    bins        : number of quantile bins for numeric features
    cat         : True if feature is categorical
    min_bin_size: collapse categories with fewer than this fraction of rows into 'Other'

    Returns
    -------
    woe_df : DataFrame with columns [bin, n_events, n_non_events, woe, iv_contribution]
    iv     : total IV score (float)
    """
    df = df[[feature, target]].copy()
    total_events     = df[target].sum()
    total_non_events = (df[target] == 0).sum()

    if cat:
        # Collapse rare categories (< min_bin_size of total rows) into 'Other'
        counts = df[feature].value_counts(normalize=True)
        rare   = counts[counts < min_bin_size].index
        df[feature] = df[feature].where(~df[feature].isin(rare), other="Other")
        df[feature] = df[feature].fillna("Missing")
        grouped = df.groupby(feature)[target]
    else:
        df[feature] = pd.to_numeric(df[feature], errors="coerce")
        df["_bin"] = pd.qcut(df[feature], q=bins, duplicates="drop")
        grouped = df.groupby("_bin")[target]

    records = []
    for bin_val, group in grouped:
        n_events     = group.sum()
        n_non_events = (group == 0).sum()

        # Laplace smoothing to avoid log(0)
        pct_events     = (n_events + 0.5)     / (total_events + 0.5)
        pct_non_events = (n_non_events + 0.5) / (total_non_events + 0.5)

        woe = np.log(pct_events / pct_non_events)
        iv_contrib = (pct_events - pct_non_events) * woe

        records.append({
            "bin":            str(bin_val),
            "n_events":       int(n_events),
            "n_non_events":   int(n_non_events),
            "pct_events":     round(pct_events, 5),
            "pct_non_events": round(pct_non_events, 5),
            "woe":            round(woe, 5),
            "iv_contribution":round(iv_contrib, 5),
        })

    woe_df = pd.DataFrame(records)
    iv     = woe_df["iv_contribution"].sum()
    return woe_df, round(iv, 5)


def iv_summary(
    df: pd.DataFrame,
    features: list[str],
    target: str,
    cat_features: list[str] | None = None,
    bins: int = 10,
) -> pd.DataFrame:
    """
    Compute IV for a list of features and return a sorted summary DataFrame.

    Parameters
    ----------
    df           : full training DataFrame
    features     : list of feature column names to evaluate
    target       : binary target column name
    cat_features : list of features to treat as categorical (default: auto-detect)
    bins         : quantile bins for numeric features

    Returns
    -------
    DataFrame sorted by IV descending, with columns [feature, iv, predictive_power]
    """
    if cat_features is None:
        cat_features = list(df[features].select_dtypes(include="object").columns)

    rows = []
    for feat in features:
        try:
            is_cat = feat in cat_features
            _, iv  = compute_woe_iv(df, feat, target, bins=bins, cat=is_cat)
            if iv < 0.02:
                power = "Useless — consider dropping"
            elif iv < 0.1:
                power = "Weak"
            elif iv < 0.3:
                power = "Medium"
            elif iv < 0.5:
                power = "Strong"
            else:
                power = "SUSPICIOUS — check for leakage"
            rows.append({"feature": feat, "iv": iv, "predictive_power": power})
        except Exception as e:
            rows.append({"feature": feat, "iv": None, "predictive_power": f"Error: {e}"})

    return pd.DataFrame(rows).sort_values("iv", ascending=False).reset_index(drop=True)


def plot_woe(woe_df: pd.DataFrame, feature_name: str, ax=None) -> None:
    """Bar chart of WoE values per bin — positive = associated with default."""
    if ax is None:
        _, ax = plt.subplots(figsize=(10, 4))

    colors = ["#d73027" if w > 0 else "#4575b4" for w in woe_df["woe"]]
    ax.bar(woe_df["bin"], woe_df["woe"], color=colors)
    ax.axhline(0, color="black", linewidth=0.8, linestyle="--")
    ax.set_title(f"WoE by bin — {feature_name}", fontsize=13)
    ax.set_xlabel("Bin / Category")
    ax.set_ylabel("WoE")
    ax.tick_params(axis="x", rotation=45)
    plt.tight_layout()


def encode_woe(
    train: pd.DataFrame,
    test: pd.DataFrame,
    features: list[str],
    target: str,
    cat_features: list[str] | None = None,
    bins: int = 10,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Replace feature values with their WoE score (for Logistic Regression / scorecard).
    Fit WoE on train only, then apply mapping to both train and test.

    Returns
    -------
    train_woe, test_woe : DataFrames with WoE-encoded feature columns (suffix _woe)
    """
    if cat_features is None:
        cat_features = list(train[features].select_dtypes(include="object").columns)

    train_out = train.copy()
    test_out  = test.copy()

    for feat in features:
        is_cat = feat in cat_features
        woe_df, _ = compute_woe_iv(train, feat, target, bins=bins, cat=is_cat)

        if is_cat:
            # Build category → WoE mapping
            woe_map = dict(zip(woe_df["bin"], woe_df["woe"]))
            train_out[feat + "_woe"] = (
                train[feat].fillna("Missing").astype(str).map(woe_map).fillna(0)
            )
            test_out[feat + "_woe"] = (
                test[feat].fillna("Missing").astype(str).map(woe_map).fillna(0)
            )
        else:
            # Build interval → WoE mapping from qcut
            col = pd.to_numeric(train[feat], errors="coerce")
            _, bin_edges = pd.qcut(col.dropna(), q=bins, duplicates="drop", retbins=True)

            def _apply_woe(series, edges, woe_df):
                binned = pd.cut(pd.to_numeric(series, errors="coerce"),
                                bins=edges, include_lowest=True)
                woe_map = dict(zip(woe_df["bin"], woe_df["woe"]))
                return binned.astype(str).map(woe_map).fillna(0)

            train_out[feat + "_woe"] = _apply_woe(train[feat], bin_edges, woe_df)
            test_out[feat + "_woe"]  = _apply_woe(test[feat],  bin_edges, woe_df)

    return train_out, test_out

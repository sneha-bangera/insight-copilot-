"""
Anomaly Detector
----------------
Runs purely on pandas — no ML, no extra dependencies.
Detects:
  - Outliers (values beyond 2 standard deviations)
  - Dominant values (one item > 50% of total)
  - Zero / near-zero values in otherwise non-zero datasets
  - Large percentage gaps between top and bottom values
  - Negative values in typically-positive columns (revenue, salary, etc.)
Returns a list of plain-English observation strings.
"""

import pandas as pd
import numpy as np
from typing import Any


# Column names that should never be negative
_POSITIVE_COLS = {
    "revenue", "sales", "profit", "salary", "income",
    "amount", "price", "cost", "units", "count", "total",
    "quantity", "orders", "transactions",
}

# Column names to skip for numeric analysis
_SKIP_COLS = {
    "id", "year", "month", "day", "rank", "index",
    "row_number", "seq", "sequence",
}


def detect(columns: list[str], rows: list[dict[str, Any]]) -> list[str]:
    """
    Analyse a query result and return a list of anomaly strings.
    Returns [] if nothing notable is found or data is too small.
    """
    if not rows or len(rows) < 2 or not columns:
        return []

    try:
        df = pd.DataFrame(rows, columns=columns)
    except Exception:
        return []

    observations: list[str] = []

    numeric_cols = [
        c for c in df.columns
        if pd.api.types.is_numeric_dtype(df[c])
        and c.lower() not in _SKIP_COLS
    ]
    text_cols = [
        c for c in df.columns
        if not pd.api.types.is_numeric_dtype(df[c])
    ]
    label_col = text_cols[0] if text_cols else None

    for col in numeric_cols:
        series = df[col].dropna().astype(float)
        if len(series) < 2:
            continue

        col_lower = col.lower()
        mean  = series.mean()
        std   = series.std()
        total = series.sum()

        if mean == 0:
            continue

        if std > 0:
            z_scores = (series - mean) / std
            outlier_mask = z_scores.abs() > 2.0
            if outlier_mask.any():
                outlier_indices = series[outlier_mask].index
                for idx in outlier_indices[:2]:   # cap at 2 mentions
                    val   = series[idx]
                    z     = abs(z_scores[idx])
                    label = str(df[label_col].iloc[idx]) if label_col else f"Row {idx+1}"
                    direction = "above" if val > mean else "below"
                    observations.append(
                        f"Outlier: {label}'s {col} ({_fmt(val)}) is "
                        f"{z:.1f}× std {direction} the average ({_fmt(mean)})."
                    )

        if total > 0 and label_col:
            max_val   = series.max()
            max_share = max_val / total
            if max_share > 0.50:
                max_label = str(df.loc[series.idxmax(), label_col])
                observations.append(
                    f"Dominant: {max_label} accounts for "
                    f"{max_share:.0%} of total {col}."
                )

        if series.min() > 0:
            ratio = series.max() / series.min()
            if ratio > 5 and label_col and len(series) >= 3:
                top_label = str(df.loc[series.idxmax(), label_col])
                bot_label = str(df.loc[series.idxmin(), label_col])
                observations.append(
                    f"Wide spread: {top_label}'s {col} is "
                    f"{ratio:.1f}× higher than {bot_label}'s."
                )

        #Zeros in positive column 
        if any(kw in col_lower for kw in _POSITIVE_COLS):
            zero_count = (series == 0).sum()
            if zero_count > 0 and label_col:
                zero_labels = df.loc[series == 0, label_col].tolist()
                names = ", ".join(str(x) for x in zero_labels[:3])
                observations.append(
                    f"Zero values: {names} reported zero {col}."
                )

        #Negative values in positive column 
        if any(kw in col_lower for kw in _POSITIVE_COLS):
            neg = series[series < 0]
            if not neg.empty and label_col:
                neg_label = str(df.loc[neg.index[0], label_col])
                observations.append(
                    f"Unexpected negative: {neg_label} has negative {col} ({_fmt(neg.iloc[0])})."
                )

    return observations[:3]


def _fmt(val: float) -> str:
    """Format a number for display — abbreviate large values."""
    if abs(val) >= 1_000_000:
        return f"{val/1_000_000:.1f}M"
    if abs(val) >= 1_000:
        return f"{val/1_000:.1f}K"
    return f"{val:.2f}"
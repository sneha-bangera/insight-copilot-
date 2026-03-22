"""
Suggestion Engine
-----------------
Generates 3-4 follow-up question chips based on:
  - The original question
  - Column names and types in the result
  - Distinct values in text columns (for filter suggestions)
Returns a list of short question strings ready to send as prompts.
"""

import pandas as pd
from typing import Any


def generate(
    question: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> list[str]:
    """Return up to 4 follow-up question strings."""
    if not rows or not columns:
        return []

    try:
        df = pd.DataFrame(rows, columns=columns)
    except Exception:
        return []

    suggestions: list[str] = []
    q_lower = question.lower()

    text_cols = [
        c for c in df.columns
        if not pd.api.types.is_numeric_dtype(df[c])
    ]
    numeric_cols = [
        c for c in df.columns
        if pd.api.types.is_numeric_dtype(df[c])
    ]

    # ── Filter by a specific value from the results ─────────────────────
    for col in text_cols[:2]:
        unique_vals = df[col].dropna().unique()
        if 2 <= len(unique_vals) <= 10:
            # Pick the top value (first row) as a filter suggestion
            top_val = str(df[col].iloc[0])
            if top_val.lower() not in q_lower:
                suggestions.append(
                    f"Show only results for {top_val}"
                )
            # Pick the bottom value for contrast
            if len(unique_vals) > 1:
                bot_val = str(df[col].iloc[-1])
                if bot_val.lower() not in q_lower and bot_val != top_val:
                    suggestions.append(
                        f"Compare {top_val} vs {bot_val}"
                    )
            break

    # ── Sort differently ─────────────────────────────────────────────────
    if numeric_cols:
        num_col = numeric_cols[0]
        if "sort" not in q_lower and "order" not in q_lower:
            if "highest" not in q_lower and "top" not in q_lower:
                suggestions.append(f"Sort by highest {num_col}")
            else:
                suggestions.append(f"Sort by lowest {num_col}")

    # ── Drill down by time ───────────────────────────────────────────────
    date_hints = ["date", "month", "year", "quarter", "week", "period"]
    has_date = any(any(h in c.lower() for h in date_hints) for c in columns)
    if has_date and "month" not in q_lower:
        suggestions.append("Break this down by month")
    elif has_date and "year" not in q_lower:
        suggestions.append("Show the yearly trend instead")

    # ── Percentage / share ───────────────────────────────────────────────
    if numeric_cols and "percent" not in q_lower and "%" not in q_lower:
        suggestions.append(f"Show each row as a % of total")

    # ── Add average ──────────────────────────────────────────────────────
    if numeric_cols and "average" not in q_lower and "avg" not in q_lower:
        suggestions.append(f"What is the average {numeric_cols[0]}?")

    # ── Deduplicate and cap ──────────────────────────────────────────────
    seen: set[str] = set()
    unique: list[str] = []
    for s in suggestions:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            unique.append(s)

    return unique[:4]
"""
Table Manager
-------------
Handles all DuckDB table operations:
  - Upload CSV → create table
  - List all tables with column info
  - Detect potential join columns across tables
  - Drop uploaded tables
"""

import os
import re
import io
import duckdb
import pandas as pd
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "sample.duckdb")

# Tables that ship with the app — never allow deleting these
SYSTEM_TABLES = {"sales", "regional_targets", "employees"}



def _sanitize_name(filename: str) -> str:
    """Turn a filename into a valid SQL table name."""
    name = filename.lower()
    # Strip extension
    name = re.sub(r"\.[^.]+$", "", name)
    # Replace spaces/hyphens with underscore
    name = re.sub(r"[\s\-]+", "_", name)
    # Keep only alphanumeric + underscore
    name = re.sub(r"[^a-z0-9_]", "", name)
    # Must start with a letter
    if name and name[0].isdigit():
        name = "t_" + name
    return name or "uploaded_table"


def _get_conn(read_only: bool = False) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH, read_only=read_only)



def upload_csv(file_bytes: bytes, filename: str) -> dict:
    """
    Load CSV bytes into DuckDB as a new table.
    Returns table metadata or raises ValueError on bad data.
    """
    # Parse CSV
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Could not parse CSV: {e}")

    if df.empty:
        raise ValueError("The uploaded CSV has no rows.")
    if len(df.columns) == 0:
        raise ValueError("The uploaded CSV has no columns.")
    if len(df) > 500_000:
        raise ValueError("File too large — maximum 500,000 rows.")

    # Sanitize column names (DuckDB chokes on spaces)
    df.columns = [
        re.sub(r"[^a-z0-9_]", "_", c.lower().strip()).strip("_") or f"col_{i}"
        for i, c in enumerate(df.columns)
    ]

    table_name = _sanitize_name(filename)

    conn = _get_conn()
    try:
        # CREATE OR REPLACE so re-uploading same file is safe
        conn.execute(
            f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df"
        )
        row_count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        cols = _describe_table(conn, table_name)
    finally:
        conn.close()

    return {
        "table_name": table_name,
        "original_filename": filename,
        "row_count": row_count,
        "columns": cols,
        "is_system": False,
    }



def _describe_table(conn, table_name: str) -> list[dict]:
    rows = conn.execute(f"PRAGMA table_info('{table_name}')").fetchall()
    return [{"name": r[1], "type": r[2]} for r in rows]


def list_tables() -> list[dict]:
    conn = _get_conn(read_only=True)
    try:
        tables = conn.execute("SHOW TABLES").fetchall()
        result = []
        for (name,) in tables:
            cols      = _describe_table(conn, name)
            row_count = conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
            result.append({
                "table_name": name,
                "row_count":  row_count,
                "columns":    cols,
                "is_system":  name in SYSTEM_TABLES,
            })
        return result
    finally:
        conn.close()


def drop_table(table_name: str) -> dict:
    if table_name in SYSTEM_TABLES:
        raise ValueError(f"Cannot delete system table '{table_name}'.")

    conn = _get_conn()
    try:
        tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
        if table_name not in tables:
            raise ValueError(f"Table '{table_name}' does not exist.")
        conn.execute(f"DROP TABLE IF EXISTS {table_name}")
    finally:
        conn.close()

    return {"deleted": table_name}


def suggest_joins() -> list[dict]:
    """
    Compares column names across all tables.
    Returns suggestions where 2+ tables share a column name
    that looks like a foreign key (ends in _id, or is a common dimension).
    """
    tables = list_tables()
    if len(tables) < 2:
        return []

    # Build map: col_name → [table_names]
    col_map: dict[str, list[str]] = {}
    for t in tables:
        for col in t["columns"]:
            cname = col["name"].lower()
            col_map.setdefault(cname, []).append(t["table_name"])

    suggestions = []
    for col, tnames in col_map.items():
        if len(tnames) < 2:
            continue
        # Only suggest meaningful join columns
        is_interesting = (
            col.endswith("_id")
            or col in {"region", "department", "category", "date",
                       "month", "year", "product", "customer", "user",
                       "employee", "salesperson", "country", "city"}
        )
        if not is_interesting:
            continue

        for i in range(len(tnames)):
            for j in range(i + 1, len(tnames)):
                suggestions.append({
                    "table_a":    tnames[i],
                    "table_b":    tnames[j],
                    "join_column": col,
                    "suggested_query": (
                        f"SELECT * FROM {tnames[i]} a "
                        f"JOIN {tnames[j]} b ON a.{col} = b.{col} LIMIT 10"
                    ),
                    "prompt_hint": (
                        f"Both '{tnames[i]}' and '{tnames[j]}' share a "
                        f"'{col}' column — you can ask questions that combine them."
                    ),
                })

    return suggestions
import duckdb
import os
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "sample.duckdb")


def execute_query(sql: str) -> dict:
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        df: pd.DataFrame = conn.execute(sql).fetchdf()
        conn.close()
        return {
            "success": True,
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
            "row_count": len(df),
        }
    except Exception as e:
        conn.close()
        return {
            "success": False,
            "error": str(e),
            "columns": [],
            "rows": [],
            "row_count": 0,
        }
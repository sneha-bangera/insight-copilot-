import duckdb
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "sample.duckdb")

# to run
#docker-compose build
#docker-compose up
#docker-compose down

def get_schema_context() -> str:
    conn = duckdb.connect(DB_PATH, read_only=True)
    tables = conn.execute("SHOW TABLES").fetchall()
    schema_parts = []

    for (table_name,) in tables:
        cols = conn.execute(f"PRAGMA table_info('{table_name}')").fetchall()
        col_lines = "\n".join(f"  - {col[1]} ({col[2]})" for col in cols)
        sample = conn.execute(f"SELECT * FROM {table_name} LIMIT 2").fetchdf()
        schema_parts.append(
            f"TABLE: {table_name}\nCOLUMNS:\n{col_lines}\nSAMPLE ROWS:\n{sample.to_string(index=False)}"
        )

    conn.close()
    return "\n\n".join(schema_parts)
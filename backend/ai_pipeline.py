"""
AI Pipeline — Phase 3
---------------------
Adds on top of Phase 2:
  - Query result caching
  - Anomaly detection on results
  - Follow-up suggestion generation
  - Response time tracking
"""

import re
import time
from schema_loader import get_schema_context
from query_executor import execute_query
from llm_router import call_llm
import cache as query_cache
from anomaly_detector import detect as detect_anomalies
from suggestion_engine import generate as generate_suggestions



def _build_prompt(
    question: str,
    schema: str,
    history: list,
    error: str = None,
) -> str:
    history_text = ""
    if history:
        history_text = "\n\nCONVERSATION HISTORY (most recent last):\n"
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    error_text = ""
    if error:
        error_text = (
            f"\n\nThe previous SQL failed with this error:\n{error}\n"
            f"Fix the SQL — do not repeat the same mistake."
        )

    return f"""You are an expert SQL analyst and business summarizer working with a DuckDB database.

DATABASE SCHEMA:
{schema}

STRICT RULES:
- Only use tables and columns listed exactly in the schema above
- Always alias aggregated columns  e.g. SUM(revenue) AS total_revenue
- Use valid DuckDB syntax only
- For dates: date_trunc('month', sale_date)  or  EXTRACT(month FROM sale_date)
- No markdown, no backticks, no code fences anywhere in your response
- SUMMARY must be 2-3 sentences of plain-English business insight — no SQL jargon
{history_text}{error_text}

QUESTION: {question}

Reply in this EXACT format — two labelled blocks, nothing else:

SQL:
<your raw sql here>

SUMMARY:
<your 2-3 sentence insight here>"""



def _parse(text: str) -> tuple[str, str]:
    sql, summary = "", ""
    try:
        if "SQL:" in text and "SUMMARY:" in text:
            sql_raw     = text.split("SQL:")[1].split("SUMMARY:")[0].strip()
            summary_raw = text.split("SUMMARY:")[1].strip()
            sql_raw = re.sub(r"```[a-z]*\s*", "", sql_raw, flags=re.IGNORECASE)
            sql_raw = re.sub(r"```", "", sql_raw).strip()
            if ";" in sql_raw:
                sql_raw = sql_raw.split(";")[0].strip() + ";"
            sql     = sql_raw
            summary = summary_raw.strip()
    except Exception:
        pass
    return sql, summary



def run_pipeline(question: str, history: list) -> dict:
    started_at = time.time()
    schema     = get_schema_context()

    # Active table names for cache keying
    import duckdb, os
    db_path = os.path.join(os.path.dirname(__file__), "data", "sample.duckdb")
    try:
        conn        = duckdb.connect(db_path, read_only=True)
        table_names = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
        conn.close()
    except Exception:
        table_names = []

    cached = query_cache.get(question, table_names)
    if cached:
        cached["from_cache"]      = True
        cached["response_time_ms"] = 0
        return cached

    #LLM call 
    prompt       = _build_prompt(question, schema, history)
    raw, provider = call_llm(prompt)
    sql, summary  = _parse(raw)

    if not sql:
        return _error_response(
            question,
            sql="",
            msg="Could not parse a valid SQL query. Please try rephrasing.",
            provider=provider,
            elapsed_ms=_ms(started_at),
        )

    result = execute_query(sql)

    if not result["success"]:
        retry_prompt       = _build_prompt(question, schema, history, error=result["error"])
        retry_raw, provider = call_llm(retry_prompt)
        sql, summary        = _parse(retry_raw)

        if not sql:
            return _error_response(
                question, sql=sql,
                msg=f"Query failed and retry could not recover. Error: {result['error']}",
                provider=provider,
                elapsed_ms=_ms(started_at),
            )
        result = execute_query(sql)

    if result["success"] and result["row_count"] == 0:
        summary = "Query ran successfully but returned no matching rows. Try adjusting your filters."
    elif result["success"] and not summary:
        summary = f"Query completed — {result['row_count']} row(s) returned."

    anomalies: list[str] = []
    if result["success"] and result["row_count"] >= 2:
        try:
            anomalies = detect_anomalies(result["columns"], result["rows"])
        except Exception:
            anomalies = []

    suggestions: list[str] = []
    if result["success"] and result["row_count"] > 0:
        try:
            suggestions = generate_suggestions(question, result["columns"], result["rows"])
        except Exception:
            suggestions = []

    response = {
        "question":        question,
        "sql":             sql,
        "summary":         summary,
        "columns":         result.get("columns", []),
        "rows":            result.get("rows", []),
        "row_count":       result.get("row_count", 0),
        "success":         result["success"],
        "error":           result.get("error"),
        "provider":        provider,
        "anomalies":       anomalies,
        "suggestions":     suggestions,
        "from_cache":      False,
        "response_time_ms": _ms(started_at),
    }

    if result["success"]:
        query_cache.set(question, table_names, response)

    return response


def _ms(started_at: float) -> int:
    return int((time.time() - started_at) * 1000)


def _error_response(question, sql, msg, provider="unknown", elapsed_ms=0) -> dict:
    return {
        "question":         question,
        "sql":              sql,
        "summary":          msg,
        "columns":          [],
        "rows":             [],
        "row_count":        0,
        "success":          False,
        "error":            msg,
        "provider":         provider,
        "anomalies":        [],
        "suggestions":      [],
        "from_cache":       False,
        "response_time_ms": elapsed_ms,
    }
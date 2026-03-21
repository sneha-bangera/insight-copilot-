"""
AI Pipeline
-----------
Single combined prompt per question (SQL + summary together).
Uses llm_router for all LLM calls — no direct API imports here.
"""

import re
from schema_loader import get_schema_context
from query_executor import execute_query
from llm_router import call_llm


# ─────────────────────────────────────────
# Prompt builder
# ─────────────────────────────────────────
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


# ─────────────────────────────────────────
# Response parser
# ─────────────────────────────────────────
def _parse(text: str) -> tuple[str, str]:
    sql, summary = "", ""
    try:
        if "SQL:" in text and "SUMMARY:" in text:
            sql_raw     = text.split("SQL:")[1].split("SUMMARY:")[0].strip()
            summary_raw = text.split("SUMMARY:")[1].strip()

            # Strip any stray markdown fences
            sql_raw = re.sub(r"```[a-z]*\s*", "", sql_raw, flags=re.IGNORECASE)
            sql_raw = re.sub(r"```", "", sql_raw).strip()

            # Keep only the first statement
            if ";" in sql_raw:
                sql_raw = sql_raw.split(";")[0].strip() + ";"

            sql     = sql_raw
            summary = summary_raw.strip()
    except Exception:
        pass
    return sql, summary


# ─────────────────────────────────────────
# Public pipeline entry point
# ─────────────────────────────────────────
def run_pipeline(question: str, history: list) -> dict:
    schema = get_schema_context()

    # ── Step 1: combined LLM call (SQL + summary) ──────────────────────────
    prompt   = _build_prompt(question, schema, history)
    raw, provider = call_llm(prompt)
    sql, summary  = _parse(raw)

    if not sql:
        return _error_response(
            question,
            sql="",
            msg="Could not parse a valid SQL query from the model response. "
                "Please try rephrasing your question.",
            provider=provider,
        )

    # ── Step 2: execute ─────────────────────────────────────────────────────
    result = execute_query(sql)

    # ── Step 3: one retry if execution fails ────────────────────────────────
    if not result["success"]:
        retry_prompt      = _build_prompt(question, schema, history, error=result["error"])
        retry_raw, provider = call_llm(retry_prompt)
        sql, summary        = _parse(retry_raw)

        if not sql:
            return _error_response(
                question,
                sql=sql,
                msg=f"Query failed and retry could not recover. "
                    f"Original error: {result['error']}",
                provider=provider,
            )

        result = execute_query(sql)

    # ── Step 4: tidy up summary ─────────────────────────────────────────────
    if result["success"] and result["row_count"] == 0:
        summary = (
            "The query ran successfully but returned no matching rows. "
            "Try adjusting your filters or date range."
        )
    elif result["success"] and not summary:
        summary = f"Query completed — {result['row_count']} row(s) returned."

    return {
        "question":   question,
        "sql":        sql,
        "summary":    summary,
        "columns":    result.get("columns", []),
        "rows":       result.get("rows", []),
        "row_count":  result.get("row_count", 0),
        "success":    result["success"],
        "error":      result.get("error"),
        "provider":   provider,   # which LLM answered this
    }


def _error_response(question, sql, msg, provider="unknown") -> dict:
    return {
        "question":  question,
        "sql":       sql,
        "summary":   msg,
        "columns":   [],
        "rows":      [],
        "row_count": 0,
        "success":   False,
        "error":     msg,
        "provider":  provider,
    }
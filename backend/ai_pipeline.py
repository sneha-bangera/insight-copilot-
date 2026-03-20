import os
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv
from schema_loader import get_schema_context
from query_executor import execute_query

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
# model = genai.GenerativeModel("gemini-2.0-flash")


def build_sql_prompt(question: str, schema: str, history: list, error: str = None) -> str:
    history_text = ""
    if history:
        history_text = "\n\nCONVERSATION HISTORY:\n"
        for msg in history[-6:]:  # last 3 turns
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    error_text = ""
    if error:
        error_text = f"\n\nThe previous SQL failed with this error:\n{error}\nPlease fix it."

    return f"""You are an expert SQL analyst. Generate a single valid DuckDB SQL query for the question below.

DATABASE SCHEMA:
{schema}

RULES:
- Return ONLY the raw SQL query, no markdown, no explanation, no backticks
- Only use columns and tables that exist in the schema above
- Always alias aggregated columns (e.g. SUM(revenue) AS total_revenue)
- Use proper DuckDB syntax
- For date filtering use: date_trunc('month', sale_date) or EXTRACT(month FROM sale_date)
- Never use columns that are not listed in the schema
{history_text}{error_text}

QUESTION: {question}

SQL:"""


def build_summary_prompt(question: str, sql: str, results: dict) -> str:
    rows_preview = results["rows"][:10]
    return f"""You are a business analyst. A user asked a data question and got results. Write a clear 2-3 sentence business insight.

QUESTION: {question}

SQL USED:
{sql}

RESULTS ({results['row_count']} rows):
{rows_preview}

Write a concise, insightful summary a business person would appreciate. Focus on the key finding, not on describing the data structure. Do not mention SQL."""


def extract_sql(text: str) -> str:
    text = text.strip()
    # Strip markdown code blocks if model adds them despite instructions
    text = re.sub(r"```sql\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*", "", text)
    # Take only the first SQL statement
    if ";" in text:
        text = text.split(";")[0] + ";"
    return text.strip()


def run_pipeline(question: str, history: list) -> dict:
    schema = get_schema_context()

    # --- Step 1: Generate SQL ---
    sql_prompt = build_sql_prompt(question, schema, history)
    sql_response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=sql_prompt
    )   
    sql = extract_sql(sql_response.text)

    # --- Step 2: Execute SQL (with one retry on error) ---
    result = execute_query(sql)

    if not result["success"]:
        # Retry once with the error message fed back to the model
        retry_prompt = build_sql_prompt(question, schema, history, error=result["error"])
        sql_response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=retry_prompt
        )
        sql = extract_sql(sql_response.text)
        result = execute_query(sql)

    # --- Step 3: Generate natural language summary ---
    summary = ""
    if result["success"] and result["row_count"] > 0:
        summary_prompt = build_summary_prompt(question, sql, result)
        summary_response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=summary_prompt
        )
        summary = summary_response.text.strip()
    elif result["success"] and result["row_count"] == 0:
        summary = "The query ran successfully but returned no results. Try adjusting your filters."
    else:
        summary = f"Sorry, I couldn't execute that query. Error: {result['error']}"

    return {
        "question": question,
        "sql": sql,
        "summary": summary,
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "row_count": result.get("row_count", 0),
        "success": result["success"],
        "error": result.get("error"),
    }
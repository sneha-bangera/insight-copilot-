# import os
# import re
# from google import genai
# from google.genai import types
# from dotenv import load_dotenv
# from schema_loader import get_schema_context
# from query_executor import execute_query

# load_dotenv()
# client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
# # model = genai.GenerativeModel("gemini-2.0-flash")


# def build_sql_prompt(question: str, schema: str, history: list, error: str = None) -> str:
#     history_text = ""
#     if history:
#         history_text = "\n\nCONVERSATION HISTORY:\n"
#         for msg in history[-6:]:  # last 3 turns
#             role = "User" if msg["role"] == "user" else "Assistant"
#             history_text += f"{role}: {msg['content']}\n"

#     error_text = ""
#     if error:
#         error_text = f"\n\nThe previous SQL failed with this error:\n{error}\nPlease fix it."

#     return f"""You are an expert SQL analyst. Generate a single valid DuckDB SQL query for the question below.

# DATABASE SCHEMA:
# {schema}

# RULES:
# - Return ONLY the raw SQL query, no markdown, no explanation, no backticks
# - Only use columns and tables that exist in the schema above
# - Always alias aggregated columns (e.g. SUM(revenue) AS total_revenue)
# - Use proper DuckDB syntax
# - For date filtering use: date_trunc('month', sale_date) or EXTRACT(month FROM sale_date)
# - Never use columns that are not listed in the schema
# {history_text}{error_text}

# QUESTION: {question}

# SQL:"""


# def build_summary_prompt(question: str, sql: str, results: dict) -> str:
#     rows_preview = results["rows"][:10]
#     return f"""You are a business analyst. A user asked a data question and got results. Write a clear 2-3 sentence business insight.

# QUESTION: {question}

# SQL USED:
# {sql}

# RESULTS ({results['row_count']} rows):
# {rows_preview}

# Write a concise, insightful summary a business person would appreciate. Focus on the key finding, not on describing the data structure. Do not mention SQL."""


# def extract_sql(text: str) -> str:
#     text = text.strip()
#     # Strip markdown code blocks if model adds them despite instructions
#     text = re.sub(r"```sql\s*", "", text, flags=re.IGNORECASE)
#     text = re.sub(r"```\s*", "", text)
#     # Take only the first SQL statement
#     if ";" in text:
#         text = text.split(";")[0] + ";"
#     return text.strip()


# def run_pipeline(question: str, history: list) -> dict:
#     schema = get_schema_context()

#     # --- Step 1: Generate SQL ---
#     sql_prompt = build_sql_prompt(question, schema, history)
#     sql_response = client.models.generate_content(
#         # model="gemini-2.0-flash",
#         model="gemini-2.5-flash",
#         contents=sql_prompt
#     )   
#     sql = extract_sql(sql_response.text)

#     # --- Step 2: Execute SQL (with one retry on error) ---
#     result = execute_query(sql)

#     if not result["success"]:
#         # Retry once with the error message fed back to the model
#         retry_prompt = build_sql_prompt(question, schema, history, error=result["error"])
#         sql_response = client.models.generate_content(
#             # model="gemini-2.0-flash",
#             model="gemini-2.5-flash",
#             contents=retry_prompt
#         )
#         sql = extract_sql(sql_response.text)
#         result = execute_query(sql)

#     # --- Step 3: Generate natural language summary ---
#     summary = ""
#     if result["success"] and result["row_count"] > 0:
#         summary_prompt = build_summary_prompt(question, sql, result)
#         summary_response = client.models.generate_content(
#             # model="gemini-2.0-flash",
#             model="gemini-2.5-flash",
#             contents=summary_prompt
#         )
#         summary = summary_response.text.strip()
#     elif result["success"] and result["row_count"] == 0:
#         summary = "The query ran successfully but returned no results. Try adjusting your filters."
#     else:
#         summary = f"Sorry, I couldn't execute that query. Error: {result['error']}"

#     return {
#         "question": question,
#         "sql": sql,
#         "summary": summary,
#         "columns": result.get("columns", []),
#         "rows": result.get("rows", []),
#         "row_count": result.get("row_count", 0),
#         "success": result["success"],
#         "error": result.get("error"),
#     }

import os
import re
from google import genai
from dotenv import load_dotenv
from schema_loader import get_schema_context
from query_executor import execute_query

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def build_combined_prompt(question: str, schema: str, history: list, error: str = None) -> str:
    history_text = ""
    if history:
        history_text = "\n\nCONVERSATION HISTORY:\n"
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    error_text = ""
    if error:
        error_text = f"\n\nThe previous SQL failed with this error:\n{error}\nPlease fix the SQL and try again."

    return f"""You are an expert SQL analyst and business summarizer working with a DuckDB database.

DATABASE SCHEMA:
{schema}

STRICT RULES:
- Only use tables and columns that exist exactly as listed in the schema above
- Always alias aggregated columns (e.g. SUM(revenue) AS total_revenue)
- Use valid DuckDB syntax only
- For date operations use: date_trunc('month', sale_date) or EXTRACT(month FROM sale_date)
- Do not use markdown, backticks, or any formatting in your SQL
- The SUMMARY must be 2-3 sentences of business insight, do not mention SQL or technical details
{history_text}{error_text}

QUESTION: {question}

You MUST respond in this EXACT format with these exact two labels, nothing else before or after:

SQL:
<raw sql query here, no backticks>

SUMMARY:
<2-3 sentence business insight here>"""


def parse_response(text: str) -> tuple[str, str]:
    sql, summary = "", ""
    try:
        if "SQL:" in text and "SUMMARY:" in text:
            sql_part = text.split("SQL:")[1].split("SUMMARY:")[0].strip()
            summary_part = text.split("SUMMARY:")[1].strip()

            # Clean SQL
            sql = re.sub(r"```sql\s*", "", sql_part, flags=re.IGNORECASE)
            sql = re.sub(r"```\s*", "", sql)
            sql = sql.strip()
            if ";" in sql:
                sql = sql.split(";")[0].strip() + ";"

            summary = summary_part.strip()
    except Exception:
        pass
    return sql, summary


def run_pipeline(question: str, history: list) -> dict:
    schema = get_schema_context()

    # --- Single Gemini call: SQL + Summary together ---
    prompt = build_combined_prompt(question, schema, history)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    sql, summary = parse_response(response.text)

    # --- Validate we got SQL back ---
    if not sql:
        return {
            "question": question,
            "sql": "",
            "summary": "I could not generate a valid response. Please try rephrasing your question.",
            "columns": [],
            "rows": [],
            "row_count": 0,
            "success": False,
            "error": "Failed to parse SQL from model response.",
        }

    # --- Execute SQL ---
    result = execute_query(sql)

    # --- One retry if SQL execution fails (still just 1 extra call, only when needed) ---
    if not result["success"]:
        retry_prompt = build_combined_prompt(question, schema, history, error=result["error"])
        retry_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=retry_prompt
        )
        sql, summary = parse_response(retry_response.text)

        if sql:
            result = execute_query(sql)
        else:
            return {
                "question": question,
                "sql": sql,
                "summary": f"The query failed and I could not recover. Error: {result['error']}",
                "columns": [],
                "rows": [],
                "row_count": 0,
                "success": False,
                "error": result["error"],
            }

    # --- Handle empty results ---
    if result["success"] and result["row_count"] == 0:
        summary = "The query ran successfully but returned no matching results. Try adjusting your filters or date range."

    # --- Fallback summary if parse missed it ---
    if result["success"] and not summary:
        summary = f"Query completed successfully and returned {result['row_count']} row(s)."

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
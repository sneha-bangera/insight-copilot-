"""
SQL Explainer
-------------
Takes a SQL query and returns a plain-English line-by-line explanation.
Results are cached so re-viewing the same SQL costs zero API calls.
"""

import hashlib
import time
from llm_router import call_llm

_cache: dict[str, str] = {}
_CACHE_TTL = 60 * 60  
_cache_times: dict[str, float] = {}


def _hash(sql: str) -> str:
    return hashlib.md5(sql.strip().lower().encode()).hexdigest()[:16]


def explain_sql(sql: str) -> str:
    """
    Returns a plain-English explanation of the SQL.
    Raises RuntimeError if all LLM providers are unavailable.
    """
    if not sql or not sql.strip():
        return "No SQL query to explain."

    key = _hash(sql)

    # Cache hit
    if key in _cache:
        if time.time() - _cache_times[key] < _CACHE_TTL:
            return _cache[key]

    prompt = f"""You are a SQL tutor explaining a query to a non-technical business person.

SQL QUERY:
{sql}

Explain this query in plain English. Use bullet points, one per clause or meaningful step.
Rules:
- No technical jargon — translate everything to plain English
- Each bullet should be one short sentence
- Do not repeat the SQL
- Focus on WHAT it does, not HOW SQL works internally
- Maximum 8 bullets
- Start directly with the bullet points, no preamble"""

    text, _ = call_llm(prompt)
    explanation = text.strip()

    _cache[key]       = explanation
    _cache_times[key] = time.time()

    return explanation
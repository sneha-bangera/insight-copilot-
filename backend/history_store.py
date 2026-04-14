"""
History Store
-------------
Persists every successful query to SQLite.
Separate from DuckDB — this is metadata, not analytics data.
Supports:
  - Save query result
  - List history (paginated)
  - Bookmark / unbookmark
  - Pin to dashboard / unpin
  - Delete entry
  - Clear all history
"""

import sqlite3
import json
import time
import os
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# DB_PATH = os.path.join(os.path.dirname(__file__), "data", "history.db")
DB_PATH = os.getenv("HISTORY_DB_PATH", "/data/history.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist. Call once on startup."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS query_history (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      TEXT    NOT NULL,
            question        TEXT    NOT NULL,
            sql             TEXT    NOT NULL,
            summary         TEXT    NOT NULL,
            columns         TEXT    NOT NULL,   -- JSON array
            rows            TEXT    NOT NULL,   -- JSON array (max 100 rows stored)
            row_count       INTEGER NOT NULL,
            provider        TEXT,
            response_time_ms INTEGER,
            anomalies       TEXT,               -- JSON array
            bookmarked      INTEGER DEFAULT 0,  -- 0 | 1
            pinned          INTEGER DEFAULT 0,  -- 0 | 1  (pinned to dashboard)
            created_at      REAL    NOT NULL    -- unix timestamp
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON query_history(session_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_pinned  ON query_history(pinned)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_created ON query_history(created_at DESC)")
    conn.commit()
    conn.close()


# ─────────────────────────────────────────
# Save
# ─────────────────────────────────────────

def save(session_id: str, result: dict) -> int:
    """Persist a successful query result. Returns the new row id."""
    if not result.get("success"):
        return -1

    # Store max 100 rows to keep DB size manageable
    rows_to_store = result.get("rows", [])[:100]

    conn = _get_conn()
    cur  = conn.execute("""
        INSERT INTO query_history
            (session_id, question, sql, summary, columns, rows,
             row_count, provider, response_time_ms, anomalies, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        result.get("question", ""),
        result.get("sql", ""),
        result.get("summary", ""),
        json.dumps(result.get("columns", [])),
        json.dumps(rows_to_store),
        result.get("row_count", 0),
        result.get("provider", ""),
        result.get("response_time_ms"),
        json.dumps(result.get("anomalies", [])),
        time.time(),
    ))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()

    # Keep only last 500 entries per session to prevent DB bloat
    _prune(session_id)
    return new_id


def _prune(session_id: str, keep: int = 500) -> None:
    conn = _get_conn()
    conn.execute("""
        DELETE FROM query_history
        WHERE session_id = ?
          AND id NOT IN (
              SELECT id FROM query_history
              WHERE session_id = ?
              ORDER BY created_at DESC
              LIMIT ?
          )
    """, (session_id, session_id, keep))
    conn.commit()
    conn.close()


# ─────────────────────────────────────────
# Read
# ─────────────────────────────────────────

def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["columns"]   = json.loads(d["columns"])
    d["rows"]      = json.loads(d["rows"])
    d["anomalies"] = json.loads(d["anomalies"] or "[]")
    d["bookmarked"] = bool(d["bookmarked"])
    d["pinned"]     = bool(d["pinned"])
    return d


def get_history(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    bookmarked_only: bool = False,
) -> list[dict]:
    conn  = _get_conn()
    where = "WHERE session_id = ?"
    args: list = [session_id]
    if bookmarked_only:
        where += " AND bookmarked = 1"
    rows = conn.execute(f"""
        SELECT * FROM query_history
        {where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """, (*args, limit, offset)).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_pinned() -> list[dict]:
    """All pinned entries across all sessions — used for dashboard."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT * FROM query_history
        WHERE pinned = 1
        ORDER BY created_at DESC
    """).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_entry(entry_id: int) -> Optional[dict]:
    conn = _get_conn()
    row  = conn.execute(
        "SELECT * FROM query_history WHERE id = ?", (entry_id,)
    ).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


# ─────────────────────────────────────────
# Mutations
# ─────────────────────────────────────────

def toggle_bookmark(entry_id: int) -> dict:
    conn = _get_conn()
    conn.execute("""
        UPDATE query_history
        SET bookmarked = CASE WHEN bookmarked = 1 THEN 0 ELSE 1 END
        WHERE id = ?
    """, (entry_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM query_history WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else {}


def toggle_pin(entry_id: int) -> dict:
    conn = _get_conn()
    conn.execute("""
        UPDATE query_history
        SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END
        WHERE id = ?
    """, (entry_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM query_history WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else {}


def delete_entry(entry_id: int) -> bool:
    conn = _get_conn()
    cur  = conn.execute("DELETE FROM query_history WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def clear_history(session_id: str) -> int:
    conn = _get_conn()
    cur  = conn.execute(
        "DELETE FROM query_history WHERE session_id = ? AND pinned = 0",
        (session_id,)
    )
    conn.commit()
    conn.close()
    return cur.rowcount


def get_stats(session_id: str) -> dict:
    conn = _get_conn()
    total      = conn.execute("SELECT COUNT(*) FROM query_history WHERE session_id = ?", (session_id,)).fetchone()[0]
    bookmarked = conn.execute("SELECT COUNT(*) FROM query_history WHERE session_id = ? AND bookmarked = 1", (session_id,)).fetchone()[0]
    pinned     = conn.execute("SELECT COUNT(*) FROM query_history WHERE pinned = 1").fetchone()[0]
    conn.close()
    return {"total": total, "bookmarked": bookmarked, "pinned": pinned}
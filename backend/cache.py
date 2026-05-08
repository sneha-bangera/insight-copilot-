"""
Query Cache
-----------
- Hashes (question + active table names) as the cache key
- TTL-based expiry (default 30 minutes)
- Cache invalidated automatically when tables change (upload/delete)
- /api/cache-stats endpoint support
"""

import hashlib
import time
from typing import Optional

# TTL in seconds — 30 minutes
CACHE_TTL = 30 * 60

# Max entries to prevent unbounded memory growth
MAX_ENTRIES = 200

_store: dict[str, dict] = {}

_table_version: int = 0


def _make_key(question: str, table_names: list[str]) -> str:
    """Deterministic cache key from question + sorted table names."""
    normalized = question.strip().lower()
    tables_str = ",".join(sorted(table_names))
    raw = f"{normalized}||{tables_str}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def get(question: str, table_names: list[str]) -> Optional[dict]:
    """Return cached result if it exists and hasn't expired."""
    key = _make_key(question, table_names)
    entry = _store.get(key)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        del _store[key]
        return None
    entry["hits"] += 1
    return entry["result"]


def set(question: str, table_names: list[str], result: dict) -> None:
    """Store a result. Evicts oldest entry if cache is full."""
    if len(_store) >= MAX_ENTRIES:
        # Evict the entry closest to expiry
        oldest_key = min(_store, key=lambda k: _store[k]["expires_at"])
        del _store[oldest_key]

    key = _make_key(question, table_names)
    _store[key] = {
        "result":     result,
        "expires_at": time.time() + CACHE_TTL,
        "hits":       0,
        "cached_at":  time.time(),
    }


def invalidate_all() -> None:
    """Call this whenever tables are added or removed."""
    global _table_version
    _store.clear()
    _table_version += 1


def get_stats() -> dict:
    now = time.time()
    active   = sum(1 for e in _store.values() if now <= e["expires_at"])
    expired  = len(_store) - active
    total_hits = sum(e["hits"] for e in _store.values())
    return {
        "total_entries":   len(_store),
        "active_entries":  active,
        "expired_entries": expired,
        "total_hits":      total_hits,
        "ttl_seconds":     CACHE_TTL,
        "max_entries":     MAX_ENTRIES,
        "table_version":   _table_version,
    }
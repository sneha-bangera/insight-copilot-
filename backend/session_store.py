from typing import List, Dict

# In-memory store: { session_id: [ {role, content}, ... ] }
_store: Dict[str, List[Dict]] = {}


def get_history(session_id: str) -> List[Dict]:
    return _store.get(session_id, [])


def add_to_history(session_id: str, question: str, result: dict):
    if session_id not in _store:
        _store[session_id] = []

    summary = result.get("summary", "")
    sql = result.get("sql", "")

    _store[session_id].append({"role": "user", "content": question})
    _store[session_id].append({
        "role": "assistant",
        "content": f"SQL: {sql}\nSummary: {summary}"
    })

    # Keep last 10 turns (20 messages) to avoid token bloat
    if len(_store[session_id]) > 20:
        _store[session_id] = _store[session_id][-20:]


def clear_history(session_id: str):
    _store[session_id] = []
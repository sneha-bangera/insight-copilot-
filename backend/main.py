
# from fastapi import FastAPI, HTTPException, UploadFile, File, Query
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from contextlib import asynccontextmanager

# from ai_pipeline import run_pipeline
# from session_store import get_history, add_to_history, clear_history
# from llm_router import check_rate_limit, get_provider_status, get_rate_limit_info
# from table_manager import upload_csv, list_tables, drop_table, suggest_joins
# import cache as query_cache
# import history_store as hs


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     hs.init_db()          # create SQLite tables on startup
#     yield

# app = FastAPI(title="Insight Copilot API", version="4.0.0", lifespan=lifespan)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ─────────────────────────────────────────
# # Models
# # ─────────────────────────────────────────
# class QueryRequest(BaseModel):
#     question:   str
#     session_id: str = "default"

# class ClearRequest(BaseModel):
#     session_id: str = "default"


# # ─────────────────────────────────────────
# # Core routes
# # ─────────────────────────────────────────
# @app.get("/health")
# def health():
#     return {"status": "ok", "version": "4.0.0"}


# @app.get("/api/status")
# def status(session_id: str = Query(default="default")):
#     return {
#         **get_provider_status(),
#         "session_rate_limit": get_rate_limit_info(session_id),
#         "cache": query_cache.get_stats(),
#         "history": hs.get_stats(session_id),
#     }


# @app.post("/api/query")
# async def query(req: QueryRequest):
#     allowed, retry_after = check_rate_limit(req.session_id)
#     if not allowed:
#         raise HTTPException(
#             status_code=429,
#             detail={
#                 "error":   "rate_limited",
#                 "message": f"Too many requests. Please wait {retry_after} seconds.",
#                 "retry_after_seconds": retry_after,
#             },
#         )

#     question = req.question.strip()
#     if not question:
#         raise HTTPException(status_code=400, detail={"error": "empty_question", "message": "Question cannot be empty."})
#     if len(question) > 500:
#         raise HTTPException(status_code=400, detail={"error": "question_too_long", "message": "Keep questions under 500 characters."})

#     try:
#         history = get_history(req.session_id)
#         result  = run_pipeline(question, history)
#         add_to_history(req.session_id, question, result)

#         # Persist to SQLite history (only non-cached successful results)
#         if result.get("success") and not result.get("from_cache"):
#             entry_id = hs.save(req.session_id, result)
#             result["history_id"] = entry_id

#         return result
#     except RuntimeError as e:
#         raise HTTPException(status_code=503, detail={"error": "providers_unavailable", "message": str(e)})
#     except Exception as e:
#         raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# @app.post("/api/clear")
# def clear(req: ClearRequest):
#     clear_history(req.session_id)
#     hs.clear_history(req.session_id)
#     return {"status": "cleared", "session_id": req.session_id}


# # ─────────────────────────────────────────
# # History routes
# # ─────────────────────────────────────────
# @app.get("/api/history")
# def get_query_history(
#     session_id:      str  = Query(default="default"),
#     limit:           int  = Query(default=50,  ge=1, le=200),
#     offset:          int  = Query(default=0,   ge=0),
#     bookmarked_only: bool = Query(default=False),
# ):
#     return {
#         "entries": hs.get_history(session_id, limit, offset, bookmarked_only),
#         "stats":   hs.get_stats(session_id),
#     }


# @app.post("/api/history/{entry_id}/bookmark")
# def bookmark(entry_id: int):
#     result = hs.toggle_bookmark(entry_id)
#     if not result:
#         raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
#     return result


# @app.post("/api/history/{entry_id}/pin")
# def pin(entry_id: int):
#     result = hs.toggle_pin(entry_id)
#     if not result:
#         raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
#     return result


# @app.delete("/api/history/{entry_id}")
# def delete_history_entry(entry_id: int):
#     if not hs.delete_entry(entry_id):
#         raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
#     return {"deleted": entry_id}


# # ─────────────────────────────────────────
# # Dashboard route
# # ─────────────────────────────────────────
# @app.get("/api/dashboard")
# def dashboard():
#     """Returns all pinned queries for the dashboard page."""
#     return {"pinned": hs.get_pinned()}


# # ─────────────────────────────────────────
# # Table management
# # ─────────────────────────────────────────
# @app.post("/api/upload")
# async def upload(file: UploadFile = File(...)):
#     if not file.filename or not file.filename.endswith(".csv"):
#         raise HTTPException(status_code=400, detail={"error": "invalid_type", "message": "Only CSV files are supported."})
#     MAX_SIZE = 20 * 1024 * 1024
#     contents = await file.read()
#     if len(contents) > MAX_SIZE:
#         raise HTTPException(status_code=400, detail={"error": "file_too_large", "message": "File must be under 20 MB."})
#     try:
#         result = upload_csv(contents, file.filename)
#         query_cache.invalidate_all()
#         return {**result, "join_suggestions": suggest_joins()}
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail={"error": "upload_failed", "message": str(e)})
#     except Exception as e:
#         raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# @app.get("/api/tables")
# def tables():
#     try:
#         return {"tables": list_tables(), "join_suggestions": suggest_joins()}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# @app.delete("/api/tables/{table_name}")
# def delete_table(table_name: str):
#     try:
#         result = drop_table(table_name)
#         query_cache.invalidate_all()
#         return result
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail={"error": "delete_failed", "message": str(e)})
#     except Exception as e:
#         raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# # ─────────────────────────────────────────
# # Cache management
# # ─────────────────────────────────────────
# @app.get("/api/cache-stats")
# def cache_stats():
#     return query_cache.get_stats()

# @app.post("/api/cache-clear")
# def cache_clear():
#     query_cache.invalidate_all()
#     return {"status": "cache cleared"}


from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Any
import io

from ai_pipeline import run_pipeline
from session_store import get_history, add_to_history, clear_history
from llm_router import check_rate_limit, get_provider_status, get_rate_limit_info
from table_manager import upload_csv, list_tables, drop_table, suggest_joins
import cache as query_cache
import history_store as hs
from exporter import to_excel, to_pdf
from explainer import explain_sql


@asynccontextmanager
async def lifespan(app: FastAPI):
    hs.init_db()
    yield

app = FastAPI(title="Insight Copilot API", version="5.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# Models
# ─────────────────────────────────────────
class QueryRequest(BaseModel):
    question:   str
    session_id: str = "default"

class ClearRequest(BaseModel):
    session_id: str = "default"

class ExportRequest(BaseModel):
    question: str
    summary:  str
    sql:      str
    columns:  list[str]
    rows:     list[dict[str, Any]]

class ExplainRequest(BaseModel):
    sql: str


# ─────────────────────────────────────────
# Core routes
# ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "5.0.0"}


@app.get("/api/status")
def status(session_id: str = Query(default="default")):
    return {
        **get_provider_status(),
        "session_rate_limit": get_rate_limit_info(session_id),
        "cache": query_cache.get_stats(),
        "history": hs.get_stats(session_id),
    }


@app.post("/api/query")
async def query(req: QueryRequest):
    allowed, retry_after = check_rate_limit(req.session_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error":   "rate_limited",
                "message": f"Too many requests. Please wait {retry_after} seconds.",
                "retry_after_seconds": retry_after,
            },
        )

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail={"error": "empty_question", "message": "Question cannot be empty."})
    if len(question) > 500:
        raise HTTPException(status_code=400, detail={"error": "question_too_long", "message": "Keep questions under 500 characters."})

    try:
        history = get_history(req.session_id)
        result  = run_pipeline(question, history)
        add_to_history(req.session_id, question, result)
        if result.get("success") and not result.get("from_cache"):
            entry_id = hs.save(req.session_id, result)
            result["history_id"] = entry_id
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail={"error": "providers_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


@app.post("/api/clear")
def clear(req: ClearRequest):
    clear_history(req.session_id)
    hs.clear_history(req.session_id)
    return {"status": "cleared", "session_id": req.session_id}


# ─────────────────────────────────────────
# Export routes
# ─────────────────────────────────────────
@app.post("/api/export/excel")
def export_excel(req: ExportRequest):
    try:
        xlsx_bytes = to_excel(req.question, req.summary, req.columns, req.rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "export_failed", "message": str(e)})

    filename = _safe_filename(req.question) + ".xlsx"
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/export/pdf")
def export_pdf(req: ExportRequest):
    try:
        pdf_bytes = to_pdf(req.question, req.summary, req.sql, req.columns, req.rows)
    except ImportError as e:
        raise HTTPException(status_code=500, detail={"error": "missing_dependency", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "export_failed", "message": str(e)})

    filename = _safe_filename(req.question) + ".pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────
# Explain route
# ─────────────────────────────────────────
@app.post("/api/explain")
def explain(req: ExplainRequest):
    if not req.sql or not req.sql.strip():
        raise HTTPException(status_code=400, detail={"error": "no_sql", "message": "No SQL provided."})
    try:
        explanation = explain_sql(req.sql)
        return {"explanation": explanation}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail={"error": "providers_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "explain_failed", "message": str(e)})


# ─────────────────────────────────────────
# History routes
# ─────────────────────────────────────────
@app.get("/api/history")
def get_query_history(
    session_id:      str  = Query(default="default"),
    limit:           int  = Query(default=50,  ge=1, le=200),
    offset:          int  = Query(default=0,   ge=0),
    bookmarked_only: bool = Query(default=False),
):
    return {"entries": hs.get_history(session_id, limit, offset, bookmarked_only), "stats": hs.get_stats(session_id)}


@app.post("/api/history/{entry_id}/bookmark")
def bookmark(entry_id: int):
    result = hs.toggle_bookmark(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
    return result


@app.post("/api/history/{entry_id}/pin")
def pin(entry_id: int):
    result = hs.toggle_pin(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
    return result


@app.delete("/api/history/{entry_id}")
def delete_history_entry(entry_id: int):
    if not hs.delete_entry(entry_id):
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entry not found."})
    return {"deleted": entry_id}


@app.get("/api/dashboard")
def dashboard():
    return {"pinned": hs.get_pinned()}


# ─────────────────────────────────────────
# Table management
# ─────────────────────────────────────────
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail={"error": "invalid_type", "message": "Only CSV files are supported."})
    MAX_SIZE = 20 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail={"error": "file_too_large", "message": "File must be under 20 MB."})
    try:
        result = upload_csv(contents, file.filename)
        query_cache.invalidate_all()
        return {**result, "join_suggestions": suggest_joins()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "upload_failed", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


@app.get("/api/tables")
def tables():
    try:
        return {"tables": list_tables(), "join_suggestions": suggest_joins()}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


@app.delete("/api/tables/{table_name}")
def delete_table(table_name: str):
    try:
        result = drop_table(table_name)
        query_cache.invalidate_all()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "delete_failed", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


@app.get("/api/cache-stats")
def cache_stats():
    return query_cache.get_stats()

@app.post("/api/cache-clear")
def cache_clear():
    query_cache.invalidate_all()
    return {"status": "cache cleared"}


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────
def _safe_filename(question: str, max_len: int = 40) -> str:
    import re
    name = re.sub(r"[^a-z0-9]+", "_", question.lower().strip())[:max_len].strip("_")
    return name or "insight_copilot_export"
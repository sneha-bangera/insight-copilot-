from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_pipeline import run_pipeline
from session_store import get_history, add_to_history, clear_history
from llm_router import check_rate_limit, get_provider_status, get_rate_limit_info

app = FastAPI(title="Insight Copilot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"


class ClearRequest(BaseModel):
    session_id: str = "default"


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/status")
def status(session_id: str = "default"):
    """
    Returns provider health + rate limit info.
    Frontend can poll this to show the status dashboard.
    """
    return {
        **get_provider_status(),
        "session_rate_limit": get_rate_limit_info(session_id),
    }


@app.post("/api/query")
async def query(req: QueryRequest):
    # ── Rate limit check ────────────────────────────────────────────────────
    allowed, retry_after = check_rate_limit(req.session_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "message": f"You've sent too many requests. Please wait {retry_after} seconds.",
                "retry_after_seconds": retry_after,
            },
        )

    # ── Validate question ───────────────────────────────────────────────────
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail={"error": "empty_question", "message": "Question cannot be empty."})
    if len(question) > 500:
        raise HTTPException(status_code=400, detail={"error": "question_too_long", "message": "Question must be under 500 characters."})

    # ── Run pipeline ────────────────────────────────────────────────────────
    try:
        history = get_history(req.session_id)
        result  = run_pipeline(question, history)
        add_to_history(req.session_id, question, result)
        return result

    except RuntimeError as e:
        # All providers exhausted — friendly message
        raise HTTPException(
            status_code=503,
            detail={
                "error": "providers_unavailable",
                "message": str(e),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"An unexpected error occurred: {str(e)}",
            },
        )


@app.post("/api/clear")
def clear(req: ClearRequest):
    clear_history(req.session_id)
    return {"status": "cleared", "session_id": req.session_id}
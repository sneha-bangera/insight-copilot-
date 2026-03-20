from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_pipeline import run_pipeline
from session_store import get_history, add_to_history, clear_history

app = FastAPI(title="Insight Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"


class ClearRequest(BaseModel):
    session_id: str = "default"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/query")
async def query(req: QueryRequest):
    try:
        history = get_history(req.session_id)
        result = run_pipeline(req.question, history)
        add_to_history(req.session_id, req.question, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clear")
def clear(req: ClearRequest):
    clear_history(req.session_id)
    return {"status": "cleared"}
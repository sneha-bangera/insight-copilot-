# Insight Copilot

**Ask business questions in plain English. Get SQL, charts, and insights — instantly.**

> A GenAI-powered analytics copilot that converts natural language into SQL queries, runs them against structured datasets, detects anomalies, and returns concise business insights with visualizations.

---

## Live Demo

| Service  | URL |
|----------|-----|
| Frontend | `https://insight-copilot-1o.vercel.app/` |
| Backend  | `https://insight-copilot-1-o.onrender.com/api/status` |
| Status   | `https://insight-copilot-1o.vercel.app/status` |

> Replace with your actual URLs after deployment.

---

## What it does

Type a question like *"Why did revenue drop in the North region last quarter?"* and Insight Copilot:

1. Generates a SQL query from your question using an LLM
2. Runs it against a real DuckDB database
3. Detects statistical anomalies in the results automatically
4. Returns a plain-English business insight + auto-selected chart
5. Suggests 3-4 follow-up questions as clickable chips
6. Lets you export results as Excel or PDF in one click

---

## Why this is different from ChatGPT / Power BI

| Feature | ChatGPT | Power BI | Insight Copilot |
|---------|---------|----------|-----------------|
| Natural language input | ✓ | ✗ | ✓ |
| Runs real SQL on persistent data | ✗ | ✓ | ✓ |
| Works on 100k+ row datasets | ✗ | ✓ | ✓ |
| Upload your own CSV | ✓ | complex | ✓ |
| Auto anomaly detection | ✗ | ✗ | ✓ |
| Conversation memory | ✓ | ✗ | ✓ |
| Pinnable insight dashboard | ✗ | ✓ | ✓ |
| Free to use | ✗ | ✗ | ✓ |
| Self-hosted + observable | ✗ | ✗ | ✓ |

---

## Features

**Core pipeline**
- Natural language → SQL generation via Gemini 2.5 Flash / Llama 3.1 70B (Groq)
- Schema-aware prompt injection — model only uses real column names
- SQL error retry loop — automatically fixes broken queries
- Single combined LLM call per question (SQL + summary together)

**Reliability**
- Round-robin LLM router with automatic failover across Groq and Gemini
- Per-provider health tracking with 60s cooldown on quota errors
- Sliding-window rate limiter (10 req/min per session)
- Query result cache (30 min TTL, invalidated on table changes)

**Intelligence**
- Statistical anomaly detection (outliers, dominant values, zero/negative flags)
- Auto-selected chart type (bar, line, pie, or table) based on data shape
- Follow-up filter chips generated after every response
- SQL explanation mode — plain English breakdown of any query

**Data management**
- CSV upload with drag-and-drop (up to 20MB, 500k rows)
- Auto join suggestions when uploaded tables share column names
- DuckDB in-process analytics engine — handles analytical queries on large data

**Persistence**
- SQLite-backed query history with bookmark and pin support
- Pinnable insight dashboard — pin any result as a persistent card
- Session-aware history with stats

**Observability**
- Live `/status` page — provider health, cache stats, rate limit usage
- Response time badge on every answer
- Cache hit indicator (⚡ cached)
- Auto-refreshes every 30 seconds

**Export**
- Excel export with formatted table, auto column widths, metadata sheet
- PDF export with dark-themed report layout

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | Industry standard, SSR, fast |
| Styling | Tailwind CSS + custom CSS vars | Dark theme, consistent tokens |
| Charts | Recharts | React-native, bar/line/pie |
| Backend | FastAPI (Python) | Async, auto docs, Pydantic |
| AI — Primary | Groq (Llama 3.1 70B) | Free, fast, great SQL quality |
| AI — Fallback | Gemini 2.5 Flash | Free backup, separate quota |
| Database | DuckDB | In-process, analytical, fast |
| History | SQLite | Lightweight, zero config |
| Cache | In-memory (Python dict) | TTL + table-version keying |
| Frontend deploy | Vercel | Free, auto-deploys from GitHub |
| Backend deploy | Render | Free tier, env var support |

---

## Architecture

```
User question
     │
     ▼
Rate limiter (10 req/min sliding window)
     │
     ▼
Cache lookup (hash of question + active tables)
     │ miss
     ▼
LLM Router ──► Groq (primary)
     │              │ quota error → mark unhealthy 60s
     │         Gemini (fallback)
     │
     ▼
Prompt: question + full schema + conversation history
     │
     ▼
LLM response: SQL + Summary (single call)
     │
     ▼
DuckDB query execution
     │ error → retry with error context (1 attempt)
     ▼
Anomaly detection (pandas statistics)
Follow-up suggestion generation
     │
     ▼
Response: { sql, summary, chart data, anomalies, suggestions }
     │
     ▼
SQLite history persist + cache store
```

---

## Local Setup

### Prerequisites

```bash
node --version    # 18+
python --version  # 3.10+
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Get free keys:
- Groq: https://console.groq.com
- Gemini: https://aistudio.google.com/app/apikey

```bash
python data/seed.py          # seed the database
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open `http://localhost:3000`

---

## Deployment

### Backend → Render

1. Push your code to GitHub
2. Go to [Render](https://render.com) → **New +** → **Web Service**
3. Connect your GitHub repository
4. Select the `backend/` folder as the root directory
5. Configure the service:
   - **Environment:** Python
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     gunicorn app:app
     ```
6. Add environment variables:
   ```env
   GROQ_API_KEY=your_key
   GEMINI_API_KEY=your_key
   ```
7. Click **Deploy Web Service**
8. Copy the generated Render URL  
   Example:
   ```txt
   https://insight-copilot-api.onrender.com
   ```

---

### Frontend → Vercel

1. Go to [Vercel](https://vercel.com) → **Import Project** → select your repo
2. Set root directory to `frontend/`
3. Add environment variable:
   ```env
   NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com
   ```
4. Deploy — Vercel gives you a live URL in ~60 seconds

---

## Sample Questions to Try

```
What is the total revenue by region?
Which salesperson generated the most revenue?
Show monthly revenue trend in 2024
Which region missed its target in Q1?
What is the average salary by department?
Show top 3 product categories by revenue
Compare actual vs target revenue for all regions
Who are the top 3 earners in the tech department?
```

---

## Project Structure

```
insight-copilot/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── ai_pipeline.py       # LLM prompt + parse
│   ├── llm_router.py        # Round-robin + health check
│   ├── schema_loader.py     # DuckDB schema reader
│   ├── query_executor.py    # SQL runner
│   ├── anomaly_detector.py  # Statistical analysis
│   ├── suggestion_engine.py # Follow-up chip generator
│   ├── cache.py             # TTL query cache
│   ├── history_store.py     # SQLite history
│   ├── session_store.py     # In-memory conversation
│   ├── table_manager.py     # CSV upload + table ops
│   ├── exporter.py          # Excel + PDF export
│   ├── explainer.py         # SQL explanation
│   ├── seed_prod.py         # Production DB seeder
│   ├── render.yaml          # Render              
│   ├── requirements.txt
│   └── data/
│       └── sample.duckdb
│
└── frontend/
    ├── app/
    │   ├── page.tsx           # Main chat UI
    │   ├── dashboard/
    │   │   └── page.tsx       # Pinned insights
    │   └── status/
    │       └── page.tsx       # Observability dashboard
    └── components/
        ├── ChartDisplay.tsx
        ├── SqlExplainer.tsx
        ├── FilterChips.tsx
        ├── ExportButtons.tsx
        ├── TablePanel.tsx
        ├── HistoryPanel.tsx
        └── DashboardCard.tsx
```

---

## Resume Bullet Points

```
• Built a GenAI analytics copilot with NL-to-SQL pipeline using Gemini 2.5 Flash and
  Llama 3.1 70B, featuring round-robin LLM routing with automatic failover and 60s
  health-based cooldown — deployed on Vercel + Render

• Engineered a schema-aware prompt injection system with single-call SQL + summary
  generation, SQL error retry loop, and 30-min TTL query cache — reducing avg API
  calls per question from 3 to 1

• Implemented statistical anomaly detection (outlier detection, dominant value
  flagging, zero-value alerts) running purely on pandas with no ML dependencies

• Built CSV upload pipeline with DuckDB ingestion (up to 500k rows), auto join
  suggestion across tables, persistent query history in SQLite, and one-click
  Excel/PDF export with formatted reports
```

---

## License

MIT
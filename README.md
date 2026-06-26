

https://github.com/user-attachments/assets/54dd73e8-bf83-41b7-a33e-0a3179ee21d4



# 🚀 Insight Copilot

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

1. **Generates SQL** from your question using LLMs (Groq Llama 3.1 70B or Google Gemini 2.5 Flash)
2. **Executes in Real-Time** against DuckDB with schema-aware context
3. **Detects Anomalies** — Automatically identifies outliers, dominant values, and data irregularities
4. **Returns Insights** — Plain-English business summary + auto-selected visualization
5. **Suggests Follow-ups** — 3-4 contextual follow-up questions as clickable chips
6. **Export Ready** — Download results as Excel or PDF in one click
7. **Maintains History** — Session-based query history with bookmarking & insights dashboard
8. **Health Monitoring** — Live status page showing provider health, cache stats, and rate limits

---

## 🎯 Why this is different

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

## 🏗️ Project Structure

```
insight-copilot/
├── frontend/                    # Next.js React app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with Theme Provider
│   │   │   ├── page.tsx         # Main chat interface
│   │   │   ├── globals.css      # Global styles + theme variables
│   │   │   ├── dashboard/       # Pinned insights dashboard
│   │   │   └── status/          # Health monitoring page
│   │   ├── components/
│   │   │   ├── ChartDisplay.tsx    # Recharts visualization
│   │   │   ├── TablePanel.tsx      # CSV upload & data preview
│   │   │   ├── HistoryPanel.tsx    # Query history
│   │   │   ├── SqlExplainer.tsx    # Query explanation
│   │   │   ├── ExportButtons.tsx   # Excel/PDF export
│   │   │   ├── FilterChips.tsx     # Follow-up suggestions
│   │   │   └── DashboardCard.tsx   # Pinned result cards
│   │   └── lib/
│   │       ├── api.ts          # Backend API client
│   │       └── utils.ts        # Utility functions
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # FastAPI Python server
│   ├── main.py                 # API routes
│   ├── ai_pipeline.py          # Core NL→SQL→Insight pipeline
│   ├── llm_router.py           # Multi-provider LLM routing + failover
│   ├── query_executor.py       # SQL execution engine (DuckDB)
│   ├── anomaly_detector.py     # Statistical anomaly detection
│   ├── suggestion_engine.py    # Follow-up question generation
│   ├── explainer.py            # SQL explanation
│   ├── exporter.py             # Excel & PDF export
│   ├── table_manager.py        # CSV upload & table management
│   ├── schema_loader.py        # Dynamic schema introspection
│   ├── session_store.py        # Session state management
│   ├── cache.py                # Query result caching (30min TTL)
│   ├── history_store.py        # SQLite-backed query history
│   ├── seed_prod.py            # Demo data seeding
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile
│   ├── Procfile                # Heroku/Railway deployment
│   ├── runtime.txt
│   ├── render.yaml             # Render platform config
│   ├── railway.json            # Railway platform config
│   └── data/
│       ├── sample.duckdb       # Sample database
│       └── seed.py             # Data seeding script
│
├── nginx/
│   └── nginx.conf             # Reverse proxy config
│
├── monitoring/
│   └── prometheus.yml         # Prometheus monitoring config
│
├── docker-compose.yml         # Multi-container orchestration
├── README.md                  # This file
└── .github/
    └── workflows/             # CI/CD automation

```

---

## 🎨 Tech Stack

### Frontend
| Technology | Version | Why |
|-----------|---------|-----|
| **Next.js** | 16.2.0 | App Router, SSR, optimal performance |
| **React** | 19.2.4 | Modern UI library with concurrent rendering |
| **TypeScript** | 5.x | Type safety, better DX |
| **Tailwind CSS** | 4.x | Utility-first, theme variables |
| **Recharts** | 3.8.0 | React chart library, multiple types |
| **next-themes** | 0.4.6 | **NEW** — Dark/light mode with localStorage |
| **Fonts** | Google Fonts | **NEW** — Playwrite AU QLD (headings) + Montserrat (body) |

### Backend
| Technology | Version | Why |
|-----------|---------|-----|
| **FastAPI** | 0.111.0 | Async, auto docs, Pydantic validation |
| **Uvicorn** | 0.29.0 | ASGI server, production-ready |
| **DuckDB** | 0.10.3 | In-process OLAP database for analytics |
| **Pandas** | 2.2.2 | Data manipulation & transformation |
| **LLMs** | - | **Groq (Llama 3.1 70B)** — primary; **Google Gemini 2.5 Flash** — fallback |
| **OpenAI SDK** | 1.30.0 | For Groq API compatibility |
| **Pydantic** | 2.7.1 | Data validation |
| **openpyxl** | 3.1.2 | Excel generation |
| **reportlab** | 4.1.0 | PDF generation |
| **Prometheus** | Latest | Metrics & monitoring |

### Infrastructure
| Component | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local dev orchestration |
| **Nginx** | Reverse proxy, static serving |
| **PostgreSQL** | Metadata store (optional) |
| **Prometheus** | Metrics collection |
| **Vercel** | Frontend hosting |
| **Render/Railway** | Backend hosting |

---

## ✨ Key Features

### 🧠 AI Pipeline
- **Natural language → SQL generation** via Groq Llama 3.1 70B (fast, free tier)
- **Fallback routing** to Google Gemini 2.5 Flash on Groq quota exhaustion
- **Schema-aware prompting** — Model only uses real column names & types
- **Auto-retry** — Fixes broken queries and handles SQL errors gracefully
- **Single combined LLM call** — SQL generation + summary in one API call

### 🔍 Intelligence
- **Anomaly detection** — Outliers, dominant values, zero/negative flagging
- **Auto chart selection** — Bar, line, pie, or table based on data shape
- **Follow-up suggestions** — Context-aware filter chips for exploration
- **SQL explanation** — Plain English breakdown of any query

### 📊 Data Management
- **CSV upload** — Drag-and-drop, up to 20MB (500k rows)
- **Auto-join suggestions** — Detects shared columns across tables
- **Dynamic schema introspection** — Automatically discovers columns & types
- **Session-scoped tables** — Uploaded data available only in session

### 💾 Persistence
- **SQLite-backed history** — Bookmark & pin results
- **Insight dashboard** — Pinnable cards persist across sessions
- **Session tracking** — User activity stats & usage patterns

### 📈 Observability
- **Live `/status` endpoint** — Provider health, cache, rate limit stats
- **Response time badge** — Shows LLM + query execution time
- **Cache hit indicator** — ⚡ badge for cached results
- **Prometheus metrics** — Full observability for deployment
- **Auto-refresh** — Status page updates every 30 seconds

### 💾 Export
- **Excel export** — Formatted table, auto column widths, metadata sheet
- **PDF export** — Dark-themed report layout

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.10+ (backend)
- Docker & Docker Compose (optional, for containerized setup)
- API Keys:
  - `GROQ_API_KEY` — Get free key at [console.groq.com](https://console.groq.com)
  - `GOOGLE_API_KEY` — Get from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Local Development

#### Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GROQ_API_KEY=your_groq_key_here
GOOGLE_API_KEY=your_google_key_here
EOF

# Run server
uvicorn main:app --reload --port 8000
```

#### Setup Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

#### Full Stack with Docker
```bash
docker-compose up
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Nginx: http://localhost:80
```

---


## 📦 Environment Variables

### Backend (.env)
```env
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIzaSy...
PORT=8000
DATABASE_URL=sqlite:///./data/history.db  # Optional: PostgreSQL support
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚢 Deployment

### Vercel (Frontend)
```bash
git push
# Auto-deploys via Vercel GitHub integration
```

### Render/Railway (Backend)
1. Connect Git repository
2. Set environment variables
3. Deploy from `backend/` directory
4. Use `Procfile` or `render.yaml` for config

### Docker Compose
```bash
docker-compose up -d
# Services: nginx (80), frontend (3000), backend (8000), postgres (5432)
```

---


## 📊 Performance Notes

- **Query Caching**: 30-minute TTL reduces LLM & DB calls
- **DuckDB**: 10-100x faster than traditional databases for OLAP queries
- **Streaming**: Large exports stream to browser (no memory spike)
- **Rate Limiting**: Prevents API abuse; 10 req/min per session

---

## 🔐 Security

- CORS enabled for frontend domains
- Rate limiting per session ID
- Input validation (question < 500 chars)
- SQL injection protection via parameterized queries
- Environment variables for sensitive data

---

## 📝 License

MIT License — Feel free to fork, modify, and deploy!

---


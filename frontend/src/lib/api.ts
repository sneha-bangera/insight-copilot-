// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// export interface QueryResponse {
//   question: string
//   sql: string
//   summary: string
//   columns: string[]
//   rows: Record<string, unknown>[]
//   row_count: number
//   success: boolean
//   error?: string
// }

// export async function askQuestion(
//   question: string,
//   sessionId: string
// ): Promise<QueryResponse> {
//   const res = await fetch(`${API_URL}/api/query`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ question, session_id: sessionId }),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'Request failed')
//   }
//   return res.json()
// }

// export async function clearSession(sessionId: string): Promise<void> {
//   await fetch(`${API_URL}/api/clear`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ session_id: sessionId }),
//   })
// }


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface QueryResponse {
  question:  string
  sql:       string
  summary:   string
  columns:   string[]
  rows:      Record<string, unknown>[]
  row_count: number
  success:   boolean
  error?:    string
  provider?: string   // which LLM answered — "Groq" | "Gemini"
}

export interface ProviderStatus {
  providers: {
    name:                      string
    model:                     string
    healthy:                   boolean
    total_calls:               number
    total_errors:              number
    last_error:                string
    cooldown_remaining_seconds: number
  }[]
  round_robin_next: string
  session_rate_limit: {
    requests_in_window: number
    limit:              number
    window_seconds:     number
    remaining:          number
  }
  config: {
    cooldown_seconds:        number
    max_provider_tries:      number
    rate_limit_window_seconds: number
    rate_limit_max_requests: number
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>

  let detail: { message?: string; error?: string } = {}
  try { detail = (await res.json()).detail ?? {} } catch (_) {}

  const msg = detail.message || detail.error || `HTTP ${res.status}`
  const err = new Error(msg) as Error & { code?: string; status?: number }
  err.code   = detail.error
  err.status = res.status
  throw err
}

// ── public API ────────────────────────────────────────────────────────────────

export async function askQuestion(
  question: string,
  sessionId: string,
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/api/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ question, session_id: sessionId }),
  })
  return handleResponse<QueryResponse>(res)
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/clear`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ session_id: sessionId }),
  })
}

export async function fetchStatus(sessionId = 'default'): Promise<ProviderStatus> {
  const res = await fetch(`${API_URL}/api/status?session_id=${sessionId}`)
  return handleResponse<ProviderStatus>(res)
}
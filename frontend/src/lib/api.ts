const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueryResponse {
  question:          string
  sql:               string
  summary:           string
  columns:           string[]
  rows:              Record<string, unknown>[]
  row_count:         number
  success:           boolean
  error?:            string
  provider?:         string
  anomalies?:        string[]
  suggestions?:      string[]
  from_cache?:       boolean
  response_time_ms?: number
  history_id?:       number     // set after saving to SQLite
}

export interface HistoryEntry {
  id:               number
  session_id:       string
  question:         string
  sql:              string
  summary:          string
  columns:          string[]
  rows:             Record<string, unknown>[]
  row_count:        number
  provider:         string
  response_time_ms: number
  anomalies:        string[]
  bookmarked:       boolean
  pinned:           boolean
  created_at:       number      // unix timestamp
}

export interface HistoryStats {
  total:      number
  bookmarked: number
  pinned:     number
}

export interface HistoryResponse {
  entries: HistoryEntry[]
  stats:   HistoryStats
}

export interface ColumnInfo      { name: string; type: string }
export interface JoinSuggestion  { table_a: string; table_b: string; join_column: string; suggested_query: string; prompt_hint: string }
export interface TableInfo       { table_name: string; row_count: number; columns: ColumnInfo[]; is_system: boolean; original_filename?: string }
export interface TablesResponse  { tables: TableInfo[]; join_suggestions: JoinSuggestion[] }
export interface UploadResponse extends TableInfo { join_suggestions: JoinSuggestion[] }

// ─── Error handler ───────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  let detail: { message?: string; error?: string } = {}
  try { detail = (await res.json()).detail ?? {} } catch (_) {}
  const msg = detail.message || detail.error || `HTTP ${res.status}`
  const err  = new Error(msg) as Error & { code?: string; status?: number }
  err.code   = detail.error
  err.status = res.status
  throw err
}

// ─── Query ───────────────────────────────────────────────────────────────────

export async function askQuestion(question: string, sessionId: string): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  })
  return handleResponse<QueryResponse>(res)
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function fetchHistory(
  sessionId: string,
  opts: { limit?: number; offset?: number; bookmarkedOnly?: boolean } = {}
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    session_id:      sessionId,
    limit:           String(opts.limit  ?? 50),
    offset:          String(opts.offset ?? 0),
    bookmarked_only: String(opts.bookmarkedOnly ?? false),
  })
  const res = await fetch(`${API_URL}/api/history?${params}`)
  return handleResponse<HistoryResponse>(res)
}

export async function toggleBookmark(entryId: number): Promise<HistoryEntry> {
  const res = await fetch(`${API_URL}/api/history/${entryId}/bookmark`, { method: 'POST' })
  return handleResponse<HistoryEntry>(res)
}

export async function togglePin(entryId: number): Promise<HistoryEntry> {
  const res = await fetch(`${API_URL}/api/history/${entryId}/pin`, { method: 'POST' })
  return handleResponse<HistoryEntry>(res)
}

export async function deleteHistoryEntry(entryId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/history/${entryId}`, { method: 'DELETE' })
  return handleResponse<void>(res)
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<{ pinned: HistoryEntry[] }> {
  const res = await fetch(`${API_URL}/api/dashboard`)
  return handleResponse<{ pinned: HistoryEntry[] }>(res)
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export async function fetchTables(): Promise<TablesResponse> {
  const res = await fetch(`${API_URL}/api/tables`)
  return handleResponse<TablesResponse>(res)
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: form })
  return handleResponse<UploadResponse>(res)
}

export async function deleteTable(tableName: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tables/${tableName}`, { method: 'DELETE' })
  return handleResponse<void>(res)
}
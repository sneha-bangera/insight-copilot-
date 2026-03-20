const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface QueryResponse {
  question: string
  sql: string
  summary: string
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  success: boolean
  error?: string
}

export async function askQuestion(
  question: string,
  sessionId: string
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
}
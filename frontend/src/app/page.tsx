'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { askQuestion, clearSession, QueryResponse } from '@/lib/api'
import ChartDisplay from '@/components/ChartDisplay'
import SqlExplainer from '@/components/SqlExplainer'

type Message =
  | { type: 'user'; text: string }
  | { type: 'assistant'; data: QueryResponse }
  | { type: 'error'; text: string }
  | { type: 'thinking' }

const SESSION_ID = 'session_' + Math.random().toString(36).slice(2, 9)

const SUGGESTIONS = [
  'What is the total revenue by region?',
  'Which salesperson generated the most revenue?',
  'Show monthly revenue trend in 2024',
  'Which region missed its target in Q1?',
  'What is the average salary by department?',
  'Show top 3 product categories by revenue',
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (question: string) => {
    if (!question.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: question }, { type: 'thinking' }])
    setLoading(true)

    try {
      const data = await askQuestion(question, SESSION_ID)
      setMessages(prev => {
        const next = prev.filter(m => m.type !== 'thinking')
        return [...next, { type: 'assistant', data }]
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setMessages(prev => {
        const next = prev.filter(m => m.type !== 'thinking')
        return [...next, { type: 'error', text: msg }]
      })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [loading])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const handleClear = async () => {
    await clearSession(SESSION_ID)
    setMessages([])
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: '#0a0a0f',
            fontSize: 14,
          }}>IC</div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
              Insight Copilot
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              NL → SQL → insights
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              gemini-2.0-flash
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              clear
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 28px' }}>
            <h1 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.3,
              marginBottom: 12,
            }}>
              Ask your data anything.
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--muted)',
              marginBottom: 36,
              lineHeight: 1.6,
              fontWeight: 300,
            }}>
              Type a business question in plain English. The copilot generates SQL,
              runs it, and returns an insight — with a chart.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {messages.map((msg, i) => {
              if (msg.type === 'user') {
                return (
                  <div key={i} className="animate-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px 12px 2px 12px',
                      padding: '12px 16px',
                      maxWidth: '70%',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      color: 'var(--text)',
                      lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                )
              }

              if (msg.type === 'thinking') {
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
                    }}>IC</div>
                    <div style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px 12px 12px 12px',
                      padding: '14px 18px',
                    }}>
                      <div className="thinking" style={{ display: 'flex', gap: 5 }}>
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )
              }

              if (msg.type === 'error') {
                return (
                  <div key={i} className="animate-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
                    }}>IC</div>
                    <div style={{
                      background: 'var(--surface)',
                      border: '1px solid #ff4d6d44',
                      borderRadius: '2px 12px 12px 12px',
                      padding: '14px 18px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--danger)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                )
              }

              if (msg.type === 'assistant') {
                const { data } = msg
                return (
                  <div key={i} className="animate-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
                    }}>IC</div>

                    <div style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px 12px 12px 12px',
                      padding: '18px 20px',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {/* Summary */}
                      <p style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        color: 'var(--text)',
                        lineHeight: 1.65,
                        marginBottom: data.rows.length > 0 ? 20 : 0,
                      }}>
                        {data.summary}
                      </p>

                      {/* Chart */}
                      {data.success && data.rows.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <ChartDisplay columns={data.columns} rows={data.rows} />
                        </div>
                      )}

                      {/* Row count badge */}
                      {data.success && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 12,
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--muted)',
                            background: 'var(--surface2)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}>
                            {data.row_count} row{data.row_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* SQL viewer */}
                      <SqlExplainer sql={data.sql} />
                    </div>
                  </div>
                )
              }

              return null
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 28px 20px',
        flexShrink: 0,
        background: 'var(--bg)',
      }}>
        <div style={{
          maxWidth: 780,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a business question... (Enter to send)"
            rows={1}
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text)',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              minHeight: 46,
              maxHeight: 140,
              overflowY: 'auto',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 140) + 'px'
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'var(--surface2)' : 'var(--accent)',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              color: loading || !input.trim() ? 'var(--muted)' : '#0a0a0f',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              height: 46,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '...' : 'run →'}
          </button>
        </div>
        <p style={{
          maxWidth: 780,
          margin: '8px auto 0',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--muted)',
          textAlign: 'center',
        }}>
          shift+enter for new line · conversation memory enabled
        </p>
      </div>
    </div>
  )
}
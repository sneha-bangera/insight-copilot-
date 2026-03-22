
// 'use client'
// import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { askQuestion, clearSession, QueryResponse } from '@/lib/api'
// import ChartDisplay from '@/components/ChartDisplay'
// import SqlExplainer from '@/components/SqlExplainer'
// import TablePanel from '@/components/TablePanel'
// import FilterChips from '@/components/FilterChips'
// import HistoryPanel from '@/components/HistoryPanel'

// type Message =
//   | { type: 'user';      text: string }
//   | { type: 'assistant'; data: QueryResponse }
//   | { type: 'error';     text: string; code?: string }
//   | { type: 'thinking' }

// type SidebarTab = 'data' | 'history'

// const SESSION_ID = 'session_' + Math.random().toString(36).slice(2, 9)

// const SUGGESTIONS = [
//   'What is the total revenue by region?',
//   'Which salesperson generated the most revenue?',
//   'Show monthly revenue trend in 2024',
//   'Which region missed its target in Q1?',
//   'What is the average salary by department?',
//   'Show top 3 product categories by revenue',
// ]

// function friendlyError(err: unknown): { text: string; code: string } {
//   const msg = err instanceof Error ? err.message : String(err)
//   if (msg.includes('rate_limited') || msg.includes('429'))
//     return { code: 'rate_limited', text: "You're sending requests too fast. Please wait a moment." }
//   if (msg.includes('providers_unavailable') || msg.includes('503'))
//     return { code: 'providers_unavailable', text: 'All AI providers are temporarily unavailable. Please wait ~60 seconds.' }
//   if (msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_REFUSED'))
//     return { code: 'backend_down', text: 'Cannot reach the backend. Make sure uvicorn is running on port 8000.' }
//   return { code: 'unknown', text: `Something went wrong: ${msg}` }
// }

// function Badge({ children, color = 'var(--ic-muted)' }: { children: React.ReactNode; color?: string }) {
//   return (
//     <span style={{
//       fontFamily: 'var(--ic-font-mono)', fontSize: 11, color,
//       background: 'var(--ic-surface2)', padding: '2px 8px',
//       borderRadius: 4, whiteSpace: 'nowrap',
//     }}>{children}</span>
//   )
// }

// function HomeInner() {
//   const router       = useRouter()
//   const searchParams = useSearchParams()

//   const [messages,     setMessages]     = useState<Message[]>([])
//   const [input,        setInput]        = useState('')
//   const [loading,      setLoading]      = useState(false)
//   const [rateLimited,  setRateLimited]  = useState(false)
//   const [retryAfter,   setRetryAfter]   = useState(0)
//   const [lastProvider, setLastProvider] = useState<string | null>(null)
//   const [sidebarOpen,  setSidebarOpen]  = useState(true)
//   const [sidebarTab,   setSidebarTab]   = useState<SidebarTab>('data')
//   const [historyKey,   setHistoryKey]   = useState(0)   // increment to reload history

//   const bottomRef = useRef<HTMLDivElement>(null)
//   const inputRef  = useRef<HTMLTextAreaElement>(null)
//   const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

//   // Handle ?q= pre-fill from dashboard rerun
//   useEffect(() => {
//     const q = searchParams.get('q')
//     if (q) {
//       setInput(q)
//       router.replace('/')   // clean the URL
//       inputRef.current?.focus()
//     }
//   }, [searchParams, router])

//   useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

//   useEffect(() => {
//     if (rateLimited && retryAfter > 0) {
//       timerRef.current = setInterval(() => {
//         setRetryAfter(s => {
//           if (s <= 1) { setRateLimited(false); clearInterval(timerRef.current!); return 0 }
//           return s - 1
//         })
//       }, 1000)
//     }
//     return () => { if (timerRef.current) clearInterval(timerRef.current) }
//   }, [rateLimited, retryAfter])

//   const send = useCallback(async (question: string) => {
//     if (!question.trim() || loading || rateLimited) return
//     setInput('')
//     setMessages(prev => [...prev, { type: 'user', text: question }, { type: 'thinking' }])
//     setLoading(true)
//     try {
//       const data = await askQuestion(question, SESSION_ID)
//       if (data.provider) setLastProvider(data.provider)
//       setMessages(prev => [...prev.filter(m => m.type !== 'thinking'), { type: 'assistant', data }])
//       // Refresh history panel after a successful query
//       if (data.success && !data.from_cache) setHistoryKey(k => k + 1)
//     } catch (e: unknown) {
//       const { text, code } = friendlyError(e)
//       if (code === 'rate_limited') {
//         const match = String(e).match(/(\d+) seconds/)
//         setRateLimited(true); setRetryAfter(match ? parseInt(match[1]) : 60)
//       }
//       setMessages(prev => [...prev.filter(m => m.type !== 'thinking'), { type: 'error', text, code }])
//     } finally {
//       setLoading(false)
//       setTimeout(() => inputRef.current?.focus(), 100)
//     }
//   }, [loading, rateLimited])

//   const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
//   }

//   const S = {
//     avatar: {
//       width: 28, height: 28, borderRadius: 8,
//       background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//       flexShrink: 0, fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-accent)',
//     } as React.CSSProperties,
//     bubble: {
//       background: 'var(--ic-surface)', border: '1px solid var(--ic-border)',
//       borderRadius: '2px 12px 12px 12px', padding: '18px 20px', flex: 1, minWidth: 0,
//     } as React.CSSProperties,
//   }

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--ic-bg)' }}>

//       {/* Header */}
//       <header style={{
//         display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//         padding: '14px 20px', borderBottom: '1px solid var(--ic-border)', flexShrink: 0,
//       }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//           <button onClick={() => setSidebarOpen(o => !o)} title="Toggle panel" style={{
//             background: sidebarOpen ? 'var(--ic-surface2)' : 'none',
//             border: '1px solid var(--ic-border)', borderRadius: 6, padding: '5px 9px',
//             color: 'var(--ic-muted)', cursor: 'pointer', fontSize: 14,
//           }}>⊞</button>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//             <div style={{
//               width: 30, height: 30, borderRadius: 8, background: 'var(--ic-accent)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               fontFamily: 'var(--ic-font-mono)', fontWeight: 600, color: '#0a0a0f', fontSize: 13,
//             }}>IC</div>
//             <div>
//               <div style={{ fontFamily: 'var(--ic-font-mono)', fontWeight: 600, fontSize: 14 }}>Insight Copilot</div>
//               <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)' }}>NL → SQL → insights</div>
//             </div>
//           </div>
//         </div>

//         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//           {/* Dashboard link */}
//           <button onClick={() => router.push('/dashboard')} style={{
//             background: 'none', border: '1px solid var(--ic-border)',
//             borderRadius: 6, padding: '5px 12px',
//             fontFamily: 'var(--ic-font-mono)', fontSize: 11,
//             color: 'var(--ic-muted)', cursor: 'pointer',
//           }}>📌 dashboard</button>

//           {lastProvider && (
//             <div style={{
//               display: 'flex', alignItems: 'center', gap: 6,
//               background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
//               borderRadius: 6, padding: '4px 10px',
//             }}>
//               <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ic-accent)' }} />
//               <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)' }}>{lastProvider}</span>
//             </div>
//           )}

//           {messages.length > 0 && (
//             <button onClick={async () => { await clearSession(SESSION_ID); setMessages([]); setLastProvider(null); setHistoryKey(k => k + 1) }} style={{
//               background: 'none', border: '1px solid var(--ic-border)',
//               color: 'var(--ic-muted)', fontFamily: 'var(--ic-font-mono)',
//               fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
//             }}>clear</button>
//           )}
//         </div>
//       </header>

//       {/* Rate limit banner */}
//       {rateLimited && (
//         <div style={{
//           background: '#ff4d6d18', borderBottom: '1px solid #ff4d6d44',
//           padding: '8px 20px', fontFamily: 'var(--ic-font-mono)',
//           fontSize: 12, color: 'var(--ic-danger)',
//           display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
//         }}>
//           ⏳ Rate limit reached — wait <strong>{retryAfter}s</strong>
//         </div>
//       )}

//       {/* Body */}
//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

//         {/* Sidebar */}
//         {sidebarOpen && (
//           <div style={{
//             width: 280, flexShrink: 0,
//             borderRight: '1px solid var(--ic-border)',
//             display: 'flex', flexDirection: 'column',
//             background: 'var(--ic-bg)',
//           }}>
//             {/* Sidebar tab switcher */}
//             <div style={{
//               display: 'flex', borderBottom: '1px solid var(--ic-border)',
//               flexShrink: 0,
//             }}>
//               {(['data', 'history'] as SidebarTab[]).map(tab => (
//                 <button key={tab} onClick={() => setSidebarTab(tab)} style={{
//                   flex: 1, background: 'none',
//                   borderBottom: `2px solid ${sidebarTab === tab ? 'var(--ic-accent)' : 'transparent'}`,
//                   border: 'none', padding: '10px 0',
//                   fontFamily: 'var(--ic-font-mono)', fontSize: 11,
//                   color: sidebarTab === tab ? 'var(--ic-accent)' : 'var(--ic-muted)',
//                   cursor: 'pointer', transition: 'color 0.15s',
//                   textTransform: 'uppercase', letterSpacing: '0.05em',
//                 }}>{tab}</button>
//               ))}
//             </div>

//             {/* Sidebar content */}
//             <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
//               {sidebarTab === 'data' ? (
//                 <TablePanel onJoinSuggest={hint => send(hint)} onTableChange={() => {}} />
//               ) : (
//                 <HistoryPanel
//                   sessionId={SESSION_ID}
//                   onRerun={q => { setSidebarOpen(true); send(q) }}
//                   refreshKey={historyKey}
//                 />
//               )}
//             </div>
//           </div>
//         )}

//         {/* Chat */}
//         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
//           <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
//             {messages.length === 0 ? (
//               <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>
//                 <h1 style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 26, fontWeight: 600, lineHeight: 1.3, marginBottom: 10 }}>
//                   Ask your data anything.
//                 </h1>
//                 <p style={{ fontFamily: 'var(--ic-font-sans)', fontSize: 14, color: 'var(--ic-muted)', marginBottom: 28, lineHeight: 1.6, fontWeight: 300 }}>
//                   Upload a CSV in the sidebar or use the built-in datasets. Ask questions in plain English.
//                 </p>
//                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
//                   {SUGGESTIONS.map((s, i) => (
//                     <button key={i} onClick={() => send(s)} style={{
//                       background: 'var(--ic-surface)', border: '1px solid var(--ic-border)',
//                       borderRadius: 10, padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
//                       fontFamily: 'var(--ic-font-sans)', fontSize: 12, color: 'var(--ic-text)',
//                       lineHeight: 1.5, transition: 'border-color 0.15s',
//                     }}
//                       onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ic-accent)')}
//                       onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--ic-border)')}
//                     >{s}</button>
//                   ))}
//                 </div>
//               </div>
//             ) : (
//               <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
//                 {messages.map((msg, i) => {
//                   if (msg.type === 'user') return (
//                     <div key={i} className="animate-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
//                       <div style={{
//                         background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
//                         borderRadius: '12px 12px 2px 12px', padding: '11px 15px', maxWidth: '70%',
//                         fontFamily: 'var(--ic-font-sans)', fontSize: 14, lineHeight: 1.5,
//                       }}>{msg.text}</div>
//                     </div>
//                   )
//                   if (msg.type === 'thinking') return (
//                     <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
//                       <div style={S.avatar}>IC</div>
//                       <div style={{ ...S.bubble, padding: '14px 16px' }}>
//                         <div className="thinking" style={{ display: 'flex', gap: 5 }}>
//                           <span /><span /><span />
//                         </div>
//                       </div>
//                     </div>
//                   )
//                   if (msg.type === 'error') return (
//                     <div key={i} className="animate-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
//                       <div style={S.avatar}>IC</div>
//                       <div style={{ ...S.bubble, border: '1px solid #ff4d6d44', padding: '14px 16px' }}>
//                         <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 12, color: 'var(--ic-danger)', display: 'flex', gap: 8 }}>
//                           <span>{msg.code === 'backend_down' ? '🔌' : msg.code === 'providers_unavailable' ? '⏳' : '⚠️'}</span>
//                           <span style={{ lineHeight: 1.6 }}>{msg.text}</span>
//                         </div>
//                         {msg.code === 'backend_down' && (
//                           <div style={{ marginTop: 8, fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)', background: 'var(--ic-bg)', padding: '6px 10px', borderRadius: 6 }}>
//                             Run: <code style={{ color: 'var(--ic-accent)' }}>uvicorn main:app --reload --port 8000</code>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )
//                   if (msg.type === 'assistant') {
//                     const { data } = msg
//                     return (
//                       <div key={i} className="animate-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
//                         <div style={S.avatar}>IC</div>
//                         <div style={S.bubble}>
//                           <p style={{
//                             fontFamily: 'var(--ic-font-sans)', fontSize: 14, lineHeight: 1.65,
//                             marginBottom: data.rows.length > 0 ? 18 : 0,
//                             color: data.success ? 'var(--ic-text)' : 'var(--ic-danger)',
//                           }}>{data.summary}</p>

//                           {data.success && data.rows.length > 0 && (
//                             <div style={{ marginBottom: 4 }}>
//                               <ChartDisplay columns={data.columns} rows={data.rows} />
//                             </div>
//                           )}

//                           {data.anomalies && data.anomalies.length > 0 && (
//                             <div style={{ marginTop: 14, background: '#f5a62314', border: '1px solid #f5a62344', borderRadius: 8, padding: '10px 14px' }}>
//                               <div style={{ fontSize: 10, fontFamily: 'var(--ic-font-mono)', color: '#f5a623', marginBottom: 6, letterSpacing: '0.05em' }}>
//                                 ANOMALIES DETECTED
//                               </div>
//                               {data.anomalies.map((a, ai) => (
//                                 <div key={ai} style={{ fontSize: 12, fontFamily: 'var(--ic-font-sans)', color: 'var(--ic-text)', lineHeight: 1.5, marginBottom: ai < data.anomalies!.length - 1 ? 6 : 0, display: 'flex', gap: 8 }}>
//                                   <span style={{ color: '#f5a623', flexShrink: 0 }}>▲</span>
//                                   <span>{a}</span>
//                                 </div>
//                               ))}
//                             </div>
//                           )}

//                           {data.success && (
//                             <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
//                               <Badge>{data.row_count} row{data.row_count !== 1 ? 's' : ''}</Badge>
//                               {data.provider && <Badge>{data.from_cache ? '⚡ cached' : `via ${data.provider}`}</Badge>}
//                               {data.response_time_ms !== undefined && !data.from_cache && (
//                                 <Badge color="var(--ic-muted)">{data.response_time_ms}ms</Badge>
//                               )}
//                               {data.history_id && (
//                                 <button
//                                   onClick={() => { setSidebarOpen(true); setSidebarTab('history') }}
//                                   style={{
//                                     background: 'none', border: 'none',
//                                     fontFamily: 'var(--ic-font-mono)', fontSize: 11,
//                                     color: 'var(--ic-muted)', cursor: 'pointer', padding: 0,
//                                   }}
//                                 >saved to history →</button>
//                               )}
//                             </div>
//                           )}

//                           <SqlExplainer sql={data.sql} />

//                           {data.suggestions && data.suggestions.length > 0 && (
//                             <FilterChips suggestions={data.suggestions} onSelect={q => send(q)} />
//                           )}
//                         </div>
//                       </div>
//                     )
//                   }
//                   return null
//                 })}
//                 <div ref={bottomRef} />
//               </div>
//             )}
//           </div>

//           {/* Input */}
//           <div style={{ borderTop: '1px solid var(--ic-border)', padding: '14px 24px 18px', flexShrink: 0, background: 'var(--ic-bg)' }}>
//             <div style={{ maxWidth: 740, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
//               <textarea
//                 ref={inputRef}
//                 value={input}
//                 onChange={e => setInput(e.target.value)}
//                 onKeyDown={handleKey}
//                 disabled={rateLimited}
//                 placeholder={rateLimited ? `Rate limited — wait ${retryAfter}s...` : 'Ask a business question... (Enter to send)'}
//                 rows={1}
//                 style={{
//                   flex: 1, background: rateLimited ? 'var(--ic-bg)' : 'var(--ic-surface)',
//                   border: `1px solid ${rateLimited ? 'var(--ic-danger)' : 'var(--ic-border)'}`,
//                   borderRadius: 10, padding: '11px 15px',
//                   fontFamily: 'var(--ic-font-sans)', fontSize: 14, color: 'var(--ic-text)',
//                   outline: 'none', resize: 'none', lineHeight: 1.5,
//                   minHeight: 44, maxHeight: 140, overflowY: 'auto',
//                   opacity: rateLimited ? 0.5 : 1,
//                 }}
//                 onFocus={e  => { if (!rateLimited) e.target.style.borderColor = 'var(--ic-accent)' }}
//                 onBlur={e   => { e.target.style.borderColor = rateLimited ? 'var(--ic-danger)' : 'var(--ic-border)' }}
//                 onInput={e  => {
//                   const t = e.currentTarget; t.style.height = 'auto'
//                   t.style.height = Math.min(t.scrollHeight, 140) + 'px'
//                 }}
//               />
//               <button
//                 onClick={() => send(input)}
//                 disabled={loading || !input.trim() || rateLimited}
//                 style={{
//                   background: (loading || !input.trim() || rateLimited) ? 'var(--ic-surface2)' : 'var(--ic-accent)',
//                   border: 'none', borderRadius: 10, padding: '11px 18px',
//                   color: (loading || !input.trim() || rateLimited) ? 'var(--ic-muted)' : '#0a0a0f',
//                   fontFamily: 'var(--ic-font-mono)', fontSize: 13, fontWeight: 600,
//                   cursor: (loading || !input.trim() || rateLimited) ? 'not-allowed' : 'pointer',
//                   height: 44, transition: 'background 0.15s', whiteSpace: 'nowrap',
//                 }}
//               >{loading ? '...' : rateLimited ? `${retryAfter}s` : 'run →'}</button>
//             </div>
//             <p style={{ maxWidth: 740, margin: '6px auto 0', fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)', textAlign: 'center' }}>
//               shift+enter for new line · 10 req/min · results cached 30 min · pin insights to dashboard
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default function Home() {
//   return (
//     <Suspense>
//       <HomeInner />
//     </Suspense>
//   )
// }


'use client'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { askQuestion, clearSession, QueryResponse } from '@/lib/api'
import ChartDisplay from '@/components/ChartDisplay'
import SqlExplainer from '@/components/SqlExplainer'
import TablePanel from '@/components/TablePanel'
import FilterChips from '@/components/FilterChips'
import HistoryPanel from '@/components/HistoryPanel'
import ExportButtons from '@/components/ExportButtons'

type Message =
  | { type: 'user';      text: string }
  | { type: 'assistant'; data: QueryResponse }
  | { type: 'error';     text: string; code?: string }
  | { type: 'thinking' }

type SidebarTab = 'data' | 'history'

const SESSION_ID = 'session_' + Math.random().toString(36).slice(2, 9)

const SUGGESTIONS = [
  'What is the total revenue by region?',
  'Which salesperson generated the most revenue?',
  'Show monthly revenue trend in 2024',
  'Which region missed its target in Q1?',
  'What is the average salary by department?',
  'Show top 3 product categories by revenue',
]

function friendlyError(err: unknown): { text: string; code: string } {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('rate_limited') || msg.includes('429'))
    return { code: 'rate_limited', text: "You're sending requests too fast. Please wait a moment." }
  if (msg.includes('providers_unavailable') || msg.includes('503'))
    return { code: 'providers_unavailable', text: 'All AI providers are temporarily unavailable. Please wait ~60 seconds.' }
  if (msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_REFUSED'))
    return { code: 'backend_down', text: 'Cannot reach the backend. Make sure uvicorn is running on port 8000.' }
  return { code: 'unknown', text: `Something went wrong: ${msg}` }
}

function Badge({ children, color = 'var(--ic-muted)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: 'var(--ic-font-mono)', fontSize: 11, color,
      background: 'var(--ic-surface2)', padding: '2px 8px',
      borderRadius: 4, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function HomeInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [rateLimited,  setRateLimited]  = useState(false)
  const [retryAfter,   setRetryAfter]   = useState(0)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [sidebarTab,   setSidebarTab]   = useState<SidebarTab>('data')
  const [historyKey,   setHistoryKey]   = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setInput(q); router.replace('/'); inputRef.current?.focus() }
  }, [searchParams, router])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (rateLimited && retryAfter > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfter(s => {
          if (s <= 1) { setRateLimited(false); clearInterval(timerRef.current!); return 0 }
          return s - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [rateLimited, retryAfter])

  const send = useCallback(async (question: string) => {
    if (!question.trim() || loading || rateLimited) return
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: question }, { type: 'thinking' }])
    setLoading(true)
    try {
      const data = await askQuestion(question, SESSION_ID)
      if (data.provider) setLastProvider(data.provider)
      setMessages(prev => [...prev.filter(m => m.type !== 'thinking'), { type: 'assistant', data }])
      if (data.success && !data.from_cache) setHistoryKey(k => k + 1)
    } catch (e: unknown) {
      const { text, code } = friendlyError(e)
      if (code === 'rate_limited') {
        const match = String(e).match(/(\d+) seconds/)
        setRateLimited(true); setRetryAfter(match ? parseInt(match[1]) : 60)
      }
      setMessages(prev => [...prev.filter(m => m.type !== 'thinking'), { type: 'error', text, code }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [loading, rateLimited])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const S = {
    avatar: {
      width: 28, height: 28, borderRadius: 8,
      background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-accent)',
    } as React.CSSProperties,
    bubble: {
      background: 'var(--ic-surface)', border: '1px solid var(--ic-border)',
      borderRadius: '2px 12px 12px 12px', padding: '18px 20px', flex: 1, minWidth: 0,
    } as React.CSSProperties,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--ic-bg)' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--ic-border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(o => !o)} title="Toggle panel" style={{
            background: sidebarOpen ? 'var(--ic-surface2)' : 'none',
            border: '1px solid var(--ic-border)', borderRadius: 6, padding: '5px 9px',
            color: 'var(--ic-muted)', cursor: 'pointer', fontSize: 14,
          }}>⊞</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--ic-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ic-font-mono)', fontWeight: 600, color: '#0a0a0f', fontSize: 13,
            }}>IC</div>
            <div>
              <div style={{ fontFamily: 'var(--ic-font-mono)', fontWeight: 600, fontSize: 14 }}>Insight Copilot</div>
              <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)' }}>NL → SQL → insights</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{
            background: 'none', border: '1px solid var(--ic-border)',
            borderRadius: 6, padding: '5px 12px',
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            color: 'var(--ic-muted)', cursor: 'pointer',
          }}>📌 dashboard</button>
          {lastProvider && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
              borderRadius: 6, padding: '4px 10px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ic-accent)' }} />
              <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)' }}>{lastProvider}</span>
            </div>
          )}
          {messages.length > 0 && (
            <button onClick={async () => { await clearSession(SESSION_ID); setMessages([]); setLastProvider(null); setHistoryKey(k => k + 1) }} style={{
              background: 'none', border: '1px solid var(--ic-border)',
              color: 'var(--ic-muted)', fontFamily: 'var(--ic-font-mono)',
              fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
            }}>clear</button>
          )}
        </div>
      </header>

      {/* Rate limit banner */}
      {rateLimited && (
        <div style={{
          background: '#ff4d6d18', borderBottom: '1px solid #ff4d6d44',
          padding: '8px 20px', fontFamily: 'var(--ic-font-mono)',
          fontSize: 12, color: 'var(--ic-danger)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          ⏳ Rate limit reached — wait <strong>{retryAfter}s</strong>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 280, flexShrink: 0, borderRight: '1px solid var(--ic-border)',
            display: 'flex', flexDirection: 'column', background: 'var(--ic-bg)',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--ic-border)', flexShrink: 0 }}>
              {(['data', 'history'] as SidebarTab[]).map(tab => (
                <button key={tab} onClick={() => setSidebarTab(tab)} style={{
                  flex: 1, background: 'none',
                  borderBottom: `2px solid ${sidebarTab === tab ? 'var(--ic-accent)' : 'transparent'}`,
                  border: 'none', padding: '10px 0',
                  fontFamily: 'var(--ic-font-mono)', fontSize: 11,
                  color: sidebarTab === tab ? 'var(--ic-accent)' : 'var(--ic-muted)',
                  cursor: 'pointer', transition: 'color 0.15s',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{tab}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {sidebarTab === 'data' ? (
                <TablePanel onJoinSuggest={hint => send(hint)} onTableChange={() => {}} />
              ) : (
                <HistoryPanel sessionId={SESSION_ID} onRerun={q => { setSidebarOpen(true); send(q) }} refreshKey={historyKey} />
              )}
            </div>
          </div>
        )}

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>
                <h1 style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 26, fontWeight: 600, lineHeight: 1.3, marginBottom: 10 }}>
                  Ask your data anything.
                </h1>
                <p style={{ fontFamily: 'var(--ic-font-sans)', fontSize: 14, color: 'var(--ic-muted)', marginBottom: 28, lineHeight: 1.6, fontWeight: 300 }}>
                  Upload a CSV in the sidebar or use the built-in datasets. Ask in plain English — get SQL, charts, and insights.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{
                      background: 'var(--ic-surface)', border: '1px solid var(--ic-border)',
                      borderRadius: 10, padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'var(--ic-font-sans)', fontSize: 12, color: 'var(--ic-text)',
                      lineHeight: 1.5, transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ic-accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--ic-border)')}
                    >{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {messages.map((msg, i) => {
                  if (msg.type === 'user') return (
                    <div key={i} className="animate-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        background: 'var(--ic-surface2)', border: '1px solid var(--ic-border)',
                        borderRadius: '12px 12px 2px 12px', padding: '11px 15px', maxWidth: '70%',
                        fontFamily: 'var(--ic-font-sans)', fontSize: 14, lineHeight: 1.5,
                      }}>{msg.text}</div>
                    </div>
                  )

                  if (msg.type === 'thinking') return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={S.avatar}>IC</div>
                      <div style={{ ...S.bubble, padding: '14px 16px' }}>
                        <div className="thinking" style={{ display: 'flex', gap: 5 }}>
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  )

                  if (msg.type === 'error') return (
                    <div key={i} className="animate-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={S.avatar}>IC</div>
                      <div style={{ ...S.bubble, border: '1px solid #ff4d6d44', padding: '14px 16px' }}>
                        <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 12, color: 'var(--ic-danger)', display: 'flex', gap: 8 }}>
                          <span>{msg.code === 'backend_down' ? '🔌' : msg.code === 'providers_unavailable' ? '⏳' : '⚠️'}</span>
                          <span style={{ lineHeight: 1.6 }}>{msg.text}</span>
                        </div>
                        {msg.code === 'backend_down' && (
                          <div style={{ marginTop: 8, fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)', background: 'var(--ic-bg)', padding: '6px 10px', borderRadius: 6 }}>
                            Run: <code style={{ color: 'var(--ic-accent)' }}>uvicorn main:app --reload --port 8000</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )

                  if (msg.type === 'assistant') {
                    const { data } = msg
                    return (
                      <div key={i} className="animate-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={S.avatar}>IC</div>
                        <div style={S.bubble}>

                          {/* Summary */}
                          <p style={{
                            fontFamily: 'var(--ic-font-sans)', fontSize: 14, lineHeight: 1.65,
                            marginBottom: data.rows.length > 0 ? 18 : 0,
                            color: data.success ? 'var(--ic-text)' : 'var(--ic-danger)',
                          }}>{data.summary}</p>

                          {/* Chart */}
                          {data.success && data.rows.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <ChartDisplay columns={data.columns} rows={data.rows} />
                            </div>
                          )}

                          {/* Anomalies */}
                          {data.anomalies && data.anomalies.length > 0 && (
                            <div style={{ marginTop: 14, background: '#f5a62314', border: '1px solid #f5a62344', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontSize: 10, fontFamily: 'var(--ic-font-mono)', color: '#f5a623', marginBottom: 6, letterSpacing: '0.05em' }}>
                                ANOMALIES DETECTED
                              </div>
                              {data.anomalies.map((a, ai) => (
                                <div key={ai} style={{ fontSize: 12, fontFamily: 'var(--ic-font-sans)', color: 'var(--ic-text)', lineHeight: 1.5, marginBottom: ai < data.anomalies!.length - 1 ? 6 : 0, display: 'flex', gap: 8 }}>
                                  <span style={{ color: '#f5a623', flexShrink: 0 }}>▲</span>
                                  <span>{a}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Footer badges */}
                          {data.success && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Badge>{data.row_count} row{data.row_count !== 1 ? 's' : ''}</Badge>
                              {data.provider && <Badge>{data.from_cache ? '⚡ cached' : `via ${data.provider}`}</Badge>}
                              {data.response_time_ms !== undefined && !data.from_cache && (
                                <Badge color="var(--ic-muted)">{data.response_time_ms}ms</Badge>
                              )}
                              {data.history_id && (
                                <button onClick={() => { setSidebarOpen(true); setSidebarTab('history') }} style={{
                                  background: 'none', border: 'none',
                                  fontFamily: 'var(--ic-font-mono)', fontSize: 11,
                                  color: 'var(--ic-muted)', cursor: 'pointer', padding: 0,
                                }}>saved to history →</button>
                              )}
                            </div>
                          )}

                          {/* SQL + Explain */}
                          <SqlExplainer sql={data.sql} />

                          {/* Export buttons — only when there's data */}
                          {data.success && data.rows.length > 0 && (
                            <ExportButtons
                              question={data.question}
                              summary={data.summary}
                              sql={data.sql}
                              columns={data.columns}
                              rows={data.rows}
                            />
                          )}

                          {/* Follow-up chips */}
                          {data.suggestions && data.suggestions.length > 0 && (
                            <FilterChips suggestions={data.suggestions} onSelect={q => send(q)} />
                          )}
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
          <div style={{ borderTop: '1px solid var(--ic-border)', padding: '14px 24px 18px', flexShrink: 0, background: 'var(--ic-bg)' }}>
            <div style={{ maxWidth: 740, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={rateLimited}
                placeholder={rateLimited ? `Rate limited — wait ${retryAfter}s...` : 'Ask a business question... (Enter to send)'}
                rows={1}
                style={{
                  flex: 1, background: rateLimited ? 'var(--ic-bg)' : 'var(--ic-surface)',
                  border: `1px solid ${rateLimited ? 'var(--ic-danger)' : 'var(--ic-border)'}`,
                  borderRadius: 10, padding: '11px 15px',
                  fontFamily: 'var(--ic-font-sans)', fontSize: 14, color: 'var(--ic-text)',
                  outline: 'none', resize: 'none', lineHeight: 1.5,
                  minHeight: 44, maxHeight: 140, overflowY: 'auto',
                  opacity: rateLimited ? 0.5 : 1,
                }}
                onFocus={e  => { if (!rateLimited) e.target.style.borderColor = 'var(--ic-accent)' }}
                onBlur={e   => { e.target.style.borderColor = rateLimited ? 'var(--ic-danger)' : 'var(--ic-border)' }}
                onInput={e  => {
                  const t = e.currentTarget; t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 140) + 'px'
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim() || rateLimited}
                style={{
                  background: (loading || !input.trim() || rateLimited) ? 'var(--ic-surface2)' : 'var(--ic-accent)',
                  border: 'none', borderRadius: 10, padding: '11px 18px',
                  color: (loading || !input.trim() || rateLimited) ? 'var(--ic-muted)' : '#0a0a0f',
                  fontFamily: 'var(--ic-font-mono)', fontSize: 13, fontWeight: 600,
                  cursor: (loading || !input.trim() || rateLimited) ? 'not-allowed' : 'pointer',
                  height: 44, transition: 'background 0.15s', whiteSpace: 'nowrap',
                }}
              >{loading ? '...' : rateLimited ? `${retryAfter}s` : 'run →'}</button>
            </div>
            <p style={{ maxWidth: 740, margin: '6px auto 0', fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)', textAlign: 'center' }}>
              shift+enter for new line · 10 req/min · export results as Excel or PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  )
}
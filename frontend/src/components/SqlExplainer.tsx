// 'use client'
// import { useState } from 'react'

// interface Props {
//   sql: string
// }

// export default function SqlExplainer({ sql }: Props) {
//   const [open, setOpen] = useState(false)

//   return (
//     <div style={{ marginTop: 10 }}>
//       <button
//         onClick={() => setOpen(o => !o)}
//         style={{
//           background: 'none',
//           border: 'none',
//           color: '#6b6b80',
//           fontFamily: 'IBM Plex Mono',
//           fontSize: 11,
//           cursor: 'pointer',
//           display: 'flex',
//           alignItems: 'center',
//           gap: 6,
//           padding: '2px 0',
//         }}
//       >
//         <span style={{ color: '#00d4aa' }}>{open ? '▾' : '▸'}</span>
//         {open ? 'hide SQL' : 'view SQL'}
//       </button>

//       {open && (
//         <pre style={{
//           marginTop: 8,
//           padding: '12px 16px',
//           background: '#0a0a0f',
//           border: '1px solid #2a2a3a',
//           borderRadius: 6,
//           fontFamily: 'IBM Plex Mono',
//           fontSize: 12,
//           color: '#00d4aa',
//           overflowX: 'auto',
//           lineHeight: 1.6,
//           whiteSpace: 'pre-wrap',
//           wordBreak: 'break-all',
//         }}>
//           {sql}
//         </pre>
//       )}
//     </div>
//   )
// }

'use client'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  sql: string
}

type View = 'closed' | 'sql' | 'explanation'

export default function SqlExplainer({ sql }: Props) {
  const [view,        setView]        = useState<View>('closed')
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loadingExp,  setLoadingExp]  = useState(false)
  const [expError,    setExpError]    = useState<string | null>(null)

  if (!sql) return null

  const toggle = (target: View) => {
    setView(v => v === target ? 'closed' : target)
  }

  const fetchExplanation = async () => {
    if (explanation) { toggle('explanation'); return }
    setLoadingExp(true)
    setExpError(null)
    try {
      const res  = await fetch(`${API_URL}/api/explain`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sql }),
      })
      if (!res.ok) throw new Error('Failed to explain query')
      const data = await res.json()
      setExplanation(data.explanation)
      setView('explanation')
    } catch (e: unknown) {
      setExpError(e instanceof Error ? e.message : 'Explain failed')
    } finally {
      setLoadingExp(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {/* Toggle buttons row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => toggle('sql')}
          style={{
            background: 'none', border: 'none',
            color: view === 'sql' ? 'var(--ic-accent)' : 'var(--ic-muted)',
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0',
          }}
        >
          <span style={{ color: 'var(--ic-accent)' }}>{view === 'sql' ? '▾' : '▸'}</span>
          view SQL
        </button>

        <span style={{ color: 'var(--ic-border)', fontSize: 11 }}>·</span>

        <button
          onClick={fetchExplanation}
          disabled={loadingExp}
          style={{
            background: 'none', border: 'none',
            color: view === 'explanation' ? 'var(--ic-accent2)' : 'var(--ic-muted)',
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            cursor: loadingExp ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0',
          }}
        >
          <span style={{ color: 'var(--ic-accent2)' }}>
            {view === 'explanation' ? '▾' : '▸'}
          </span>
          {loadingExp ? 'explaining...' : 'explain this'}
        </button>

        {expError && (
          <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-danger)' }}>
            ⚠ {expError}
          </span>
        )}
      </div>

      {/* SQL panel */}
      {view === 'sql' && (
        <pre style={{
          marginTop: 8, padding: '12px 16px',
          background: 'var(--ic-bg)',
          border: '1px solid var(--ic-border)',
          borderRadius: 6, fontFamily: 'var(--ic-font-mono)',
          fontSize: 12, color: 'var(--ic-accent)',
          overflowX: 'auto', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {sql}
        </pre>
      )}

      {/* Explanation panel */}
      {view === 'explanation' && explanation && (
        <div style={{
          marginTop: 8, padding: '12px 16px',
          background: '#7c6af710',
          border: '1px solid #7c6af730',
          borderRadius: 6,
        }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--ic-font-mono)',
            color: 'var(--ic-accent2)', marginBottom: 8,
            letterSpacing: '0.05em',
          }}>
            PLAIN ENGLISH EXPLANATION
          </div>
          {explanation.split('\n').filter(l => l.trim()).map((line, i) => {
            const clean = line.replace(/^[-•*]\s*/, '').trim()
            if (!clean) return null
            return (
              <div key={i} style={{
                display: 'flex', gap: 8, marginBottom: 6,
                fontFamily: 'var(--ic-font-sans)', fontSize: 12,
                color: 'var(--ic-text)', lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--ic-accent2)', flexShrink: 0, marginTop: 1 }}>→</span>
                <span>{clean}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
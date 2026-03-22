'use client'
import { HistoryEntry, togglePin } from '@/lib/api'
import ChartDisplay from '@/components/ChartDisplay'

interface Props {
  entry:    HistoryEntry
  onUnpin:  (id: number) => void
  onRerun:  (question: string) => void
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DashboardCard({ entry, onUnpin, onRerun }: Props) {
  const handleUnpin = async () => {
    await togglePin(entry.id)
    onUnpin(entry.id)
  }

  return (
    <div style={{
      background: 'var(--ic-surface)',
      border: '1px solid var(--ic-border)',
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ic-accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--ic-border)')}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--ic-font-sans)', fontSize: 13,
          color: 'var(--ic-text)', lineHeight: 1.5, fontWeight: 500,
          flex: 1,
        }}>
          {entry.question}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onRerun(entry.question)}
            title="Re-run this query"
            style={{
              background: 'none',
              border: '1px solid var(--ic-border)',
              borderRadius: 6, padding: '4px 10px',
              fontFamily: 'var(--ic-font-mono)', fontSize: 11,
              color: 'var(--ic-muted)', cursor: 'pointer',
            }}
          >↻ rerun</button>
          <button
            onClick={handleUnpin}
            title="Unpin from dashboard"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, padding: '4px', color: 'var(--ic-accent)',
            }}
          >📌</button>
        </div>
      </div>

      {/* Summary */}
      <p style={{
        fontFamily: 'var(--ic-font-sans)', fontSize: 12,
        color: 'var(--ic-muted)', lineHeight: 1.6, margin: 0,
      }}>
        {entry.summary}
      </p>

      {/* Chart */}
      {entry.rows && entry.rows.length > 0 && (
        <ChartDisplay columns={entry.columns} rows={entry.rows} />
      )}

      {/* Anomalies */}
      {entry.anomalies && entry.anomalies.length > 0 && (
        <div style={{
          background: '#f5a62310', border: '1px solid #f5a62330',
          borderRadius: 6, padding: '8px 12px',
        }}>
          {entry.anomalies.map((a, i) => (
            <div key={i} style={{
              fontSize: 11, fontFamily: 'var(--ic-font-sans)',
              color: 'var(--ic-text)', lineHeight: 1.5,
              display: 'flex', gap: 6,
              marginBottom: i < entry.anomalies.length - 1 ? 4 : 0,
            }}>
              <span style={{ color: '#f5a623', flexShrink: 0 }}>▲</span>
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        paddingTop: 4, borderTop: '1px solid var(--ic-border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)' }}>
          {timeAgo(entry.created_at)}
        </span>
        {entry.provider && (
          <span style={{
            fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)',
            background: 'var(--ic-surface2)', padding: '1px 6px', borderRadius: 4,
          }}>{entry.provider}</span>
        )}
        <span style={{
          fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)',
          background: 'var(--ic-surface2)', padding: '1px 6px', borderRadius: 4,
        }}>{entry.row_count} rows</span>
      </div>
    </div>
  )
}
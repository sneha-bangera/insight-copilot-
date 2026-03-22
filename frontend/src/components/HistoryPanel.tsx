'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchHistory, toggleBookmark, togglePin, deleteHistoryEntry, HistoryEntry } from '@/lib/api'

interface Props {
  sessionId:  string
  onRerun:    (question: string) => void
  refreshKey: number    // increment from parent to trigger reload
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function HistoryPanel({ sessionId, onRerun, refreshKey }: Props) {
  const [entries,         setEntries]         = useState<HistoryEntry[]>([])
  const [bookmarkedOnly,  setBookmarkedOnly]   = useState(false)
  const [stats,           setStats]           = useState({ total: 0, bookmarked: 0, pinned: 0 })
  const [loading,         setLoading]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchHistory(sessionId, { limit: 60, bookmarkedOnly })
      setEntries(data.entries)
      setStats(data.stats)
    } catch (_) {}
    finally { setLoading(false) }
  }, [sessionId, bookmarkedOnly])

  useEffect(() => { load() }, [load, refreshKey])

  const handleBookmark = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    const updated = await toggleBookmark(id)
    setEntries(prev => prev.map(en => en.id === id ? { ...en, bookmarked: updated.bookmarked } : en))
    setStats(prev => ({
      ...prev,
      bookmarked: prev.bookmarked + (updated.bookmarked ? 1 : -1),
    }))
  }

  const handlePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    const updated = await togglePin(id)
    setEntries(prev => prev.map(en => en.id === id ? { ...en, pinned: updated.pinned } : en))
    setStats(prev => ({ ...prev, pinned: prev.pinned + (updated.pinned ? 1 : -1) }))
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Remove this entry from history?')) return
    await deleteHistoryEntry(id)
    setEntries(prev => prev.filter(en => en.id !== id))
    setStats(prev => ({ ...prev, total: prev.total - 1 }))
  }

  const mono  = 'var(--ic-font-mono)'
  const sans  = 'var(--ic-font-sans)'
  const muted = 'var(--ic-muted)'
  const border = 'var(--ic-border)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'total',      value: stats.total },
          { label: 'bookmarked', value: stats.bookmarked },
          { label: 'pinned',     value: stats.pinned },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--ic-surface)',
            border: `1px solid ${border}`, borderRadius: 8,
            padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 600, color: 'var(--ic-text)' }}>
              {s.value}
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'bookmarked'] as const).map(f => (
          <button key={f} onClick={() => setBookmarkedOnly(f === 'bookmarked')} style={{
            flex: 1, background: (f === 'bookmarked') === bookmarkedOnly ? 'var(--ic-surface2)' : 'none',
            border: `1px solid ${(f === 'bookmarked') === bookmarkedOnly ? 'var(--ic-accent)' : border}`,
            borderRadius: 6, padding: '5px 0',
            fontFamily: mono, fontSize: 11,
            color: (f === 'bookmarked') === bookmarkedOnly ? 'var(--ic-accent)' : muted,
            cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>

      {/* Entry list */}
      {loading ? (
        <div style={{ fontFamily: mono, fontSize: 12, color: muted, textAlign: 'center', padding: '12px 0' }}>
          loading...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ fontFamily: sans, fontSize: 12, color: muted, textAlign: 'center', padding: '16px 0' }}>
          {bookmarkedOnly ? 'No bookmarked queries yet.' : 'No history yet — ask a question!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(entry => (
            <div
              key={entry.id}
              onClick={() => onRerun(entry.question)}
              style={{
                background: 'var(--ic-surface)',
                border: `1px solid ${entry.pinned ? 'var(--ic-accent)44' : border}`,
                borderRadius: 8, padding: '10px 12px',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ic-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = entry.pinned ? 'var(--ic-accent)44' : border)}
            >
              {/* Question */}
              <div style={{
                fontFamily: sans, fontSize: 12,
                color: 'var(--ic-text)', lineHeight: 1.5,
                marginBottom: 8,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {entry.question}
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: muted }}>
                    {timeAgo(entry.created_at)}
                  </span>
                  {entry.provider && (
                    <span style={{
                      fontFamily: mono, fontSize: 10, color: muted,
                      background: 'var(--ic-surface2)', padding: '1px 6px', borderRadius: 4,
                    }}>{entry.provider}</span>
                  )}
                  {entry.row_count > 0 && (
                    <span style={{ fontFamily: mono, fontSize: 10, color: muted }}>
                      {entry.row_count} rows
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => handlePin(e, entry.id)}
                    title={entry.pinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, padding: '2px 4px', lineHeight: 1,
                      color: entry.pinned ? 'var(--ic-accent)' : muted,
                      opacity: entry.pinned ? 1 : 0.5,
                    }}
                  >📌</button>
                  <button
                    onClick={e => handleBookmark(e, entry.id)}
                    title={entry.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, padding: '2px 4px', lineHeight: 1,
                      color: entry.bookmarked ? '#f5a623' : muted,
                      opacity: entry.bookmarked ? 1 : 0.5,
                    }}
                  >★</button>
                  <button
                    onClick={e => handleDelete(e, entry.id)}
                    title="Delete"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, padding: '2px 4px', lineHeight: 1,
                      color: 'var(--ic-danger)', opacity: 0.5,
                    }}
                  >×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
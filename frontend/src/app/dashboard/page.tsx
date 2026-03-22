'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchDashboard, HistoryEntry } from '@/lib/api'
import DashboardCard from '@/components/DashboardCard'

export default function DashboardPage() {
  const [cards,   setCards]   = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchDashboard()
      setCards(data.pinned)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleUnpin = (id: number) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const handleRerun = (question: string) => {
    // Navigate to main page with question pre-filled via URL param
    router.push(`/?q=${encodeURIComponent(question)}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ic-bg)', color: 'var(--ic-text)' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--ic-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none', border: '1px solid var(--ic-border)',
              borderRadius: 6, padding: '5px 12px',
              fontFamily: 'var(--ic-font-mono)', fontSize: 12,
              color: 'var(--ic-muted)', cursor: 'pointer',
            }}
          >← back</button>
          <div>
            <div style={{ fontFamily: 'var(--ic-font-mono)', fontWeight: 600, fontSize: 16 }}>
              Dashboard
            </div>
            <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)' }}>
              Pinned insights
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 12, color: 'var(--ic-muted)' }}>
            {cards.length} card{cards.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={load}
            style={{
              background: 'none', border: '1px solid var(--ic-border)',
              borderRadius: 6, padding: '5px 12px',
              fontFamily: 'var(--ic-font-mono)', fontSize: 12,
              color: 'var(--ic-muted)', cursor: 'pointer',
            }}
          >↻ refresh</button>
        </div>
      </header>

      {/* Body */}
      <main style={{ padding: '28px', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            fontFamily: 'var(--ic-font-mono)', fontSize: 13, color: 'var(--ic-muted)',
          }}>
            Loading dashboard...
          </div>
        ) : cards.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            maxWidth: 440, margin: '0 auto',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📌</div>
            <div style={{
              fontFamily: 'var(--ic-font-mono)', fontSize: 16,
              fontWeight: 600, marginBottom: 10,
            }}>
              No pinned insights yet
            </div>
            <p style={{
              fontFamily: 'var(--ic-font-sans)', fontSize: 14,
              color: 'var(--ic-muted)', lineHeight: 1.6, marginBottom: 24,
            }}>
              Ask questions in the chat, then click the 📌 icon in the history panel
              to pin your most important insights here.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'var(--ic-accent)', border: 'none',
                borderRadius: 8, padding: '10px 24px',
                fontFamily: 'var(--ic-font-mono)', fontSize: 13,
                fontWeight: 600, color: '#0a0a0f', cursor: 'pointer',
              }}
            >Go ask a question →</button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 20,
          }}>
            {cards.map(card => (
              <DashboardCard
                key={card.id}
                entry={card}
                onUnpin={handleUnpin}
                onRerun={handleRerun}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SESSION_ID = typeof window !== 'undefined'
  ? (localStorage.getItem('ic_session') || 'default')
  : 'default'
const REFRESH_INTERVAL = 30_000   // 30 seconds

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderInfo {
  name:                       string
  model:                      string
  healthy:                    boolean
  total_calls:                number
  total_errors:               number
  last_error:                 string
  cooldown_remaining_seconds: number
}

interface StatusData {
  providers: ProviderInfo[]
  round_robin_next: string
  config: {
    cooldown_seconds:           number
    max_provider_tries:         number
    rate_limit_window_seconds:  number
    rate_limit_max_requests:    number
  }
  session_rate_limit: {
    requests_in_window: number
    limit:              number
    window_seconds:     number
    remaining:          number
  }
  cache: {
    total_entries:   number
    active_entries:  number
    expired_entries: number
    total_hits:      number
    ttl_seconds:     number
    max_entries:     number
    table_version:   number
  }
  history: {
    total:      number
    bookmarked: number
    pinned:     number
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--ic-font-mono)', fontSize: 10,
      color: 'var(--ic-muted)', letterSpacing: '0.08em',
      marginBottom: 12, textTransform: 'uppercase',
    }}>{children}</div>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--ic-surface)',
      border: `1px solid ${accent ? accent + '44' : 'var(--ic-border)'}`,
      borderRadius: 10, padding: '18px 20px',
    }}>{children}</div>
  )
}

function StatRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: 8, marginBottom: 8,
      borderBottom: '1px solid var(--ic-border)',
    }}>
      <span style={{ fontFamily: 'var(--ic-font-sans)', fontSize: 13, color: 'var(--ic-muted)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--ic-font-mono)', fontSize: 13,
        color: valueColor || 'var(--ic-text)', fontWeight: 500,
      }}>{value}</span>
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ background: 'var(--ic-surface2)', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: color, borderRadius: 4,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function PulsingDot({ color }: { color: string }) {
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%', background: color, opacity: 0.3,
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <div style={{
        position: 'absolute', inset: '2px',
        borderRadius: '50%', background: color,
      }} />
    </div>
  )
}

function ProviderCard({ provider, isNext }: { provider: ProviderInfo; isNext: boolean }) {
  const healthy      = provider.healthy
  const errorRate    = provider.total_calls > 0
    ? ((provider.total_errors / (provider.total_calls + provider.total_errors)) * 100).toFixed(1)
    : '0.0'
  const statusColor  = healthy ? 'var(--ic-accent)' : 'var(--ic-danger)'

  return (
    <Card accent={healthy ? '#00d4aa' : '#ff4d6d'}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PulsingDot color={statusColor} />
          <div>
            <div style={{ fontFamily: 'var(--ic-font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--ic-text)' }}>
              {provider.name}
            </div>
            <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)' }}>
              {provider.model}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isNext && (
            <span style={{
              fontFamily: 'var(--ic-font-mono)', fontSize: 10,
              color: 'var(--ic-accent)', background: 'var(--ic-accent)18',
              padding: '2px 8px', borderRadius: 4,
            }}>NEXT</span>
          )}
          <span style={{
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            color: statusColor,
            background: healthy ? '#00d4aa18' : '#ff4d6d18',
            padding: '3px 10px', borderRadius: 20,
          }}>
            {healthy ? 'healthy' : `cooldown ${provider.cooldown_remaining_seconds}s`}
          </span>
        </div>
      </div>

      {/* Stats */}
      <StatRow label="Total calls"  value={provider.total_calls.toLocaleString()} />
      <StatRow label="Total errors" value={provider.total_errors} valueColor={provider.total_errors > 0 ? 'var(--ic-danger)' : 'var(--ic-text)'} />
      <StatRow label="Error rate"   value={`${errorRate}%`}       valueColor={parseFloat(errorRate) > 10 ? 'var(--ic-danger)' : 'var(--ic-text)'} />

      {!healthy && provider.last_error && (
        <div style={{
          marginTop: 10, padding: '8px 10px',
          background: '#ff4d6d10', border: '1px solid #ff4d6d30',
          borderRadius: 6, fontFamily: 'var(--ic-font-mono)',
          fontSize: 10, color: 'var(--ic-danger)',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          {provider.last_error.slice(0, 160)}
        </div>
      )}
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const router    = useRouter()
  const [data,    setData]    = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [countdown,   setCountdown]   = useState(REFRESH_INTERVAL / 1000)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/status?session_id=${SESSION_ID}`)
      const json = await res.json()
      setData(json)
      setError(null)
      setLastRefresh(new Date())
      setCountdown(REFRESH_INTERVAL / 1000)
    } catch (e) {
      setError('Cannot reach backend. Make sure uvicorn is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()

    // Auto refresh
    timerRef.current = setInterval(fetchStatus, REFRESH_INTERVAL)

    // Countdown ticker
    countRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [fetchStatus])

  const healthyCount   = data?.providers.filter(p => p.healthy).length ?? 0
  const totalProviders = data?.providers.length ?? 0
  const allHealthy     = healthyCount === totalProviders

  return (
    <div style={{ height: '100vh', overflowY:'auto', background: 'var(--ic-bg)', color: 'var(--ic-text)' }}>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--ic-border)',
        position: 'sticky', top: 0,
        background: 'var(--ic-bg)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: '1px solid var(--ic-border)',
            borderRadius: 6, padding: '5px 12px',
            fontFamily: 'var(--ic-font-mono)', fontSize: 12,
            color: 'var(--ic-muted)', cursor: 'pointer',
          }}>← back</button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'var(--ic-font-mono)', fontWeight: 600, fontSize: 16 }}>
                System Status
              </div>
              {!loading && data && (
                <span style={{
                  fontFamily: 'var(--ic-font-mono)', fontSize: 11,
                  color: allHealthy ? 'var(--ic-accent)' : 'var(--ic-danger)',
                  background: allHealthy ? '#00d4aa18' : '#ff4d6d18',
                  padding: '2px 10px', borderRadius: 20,
                }}>
                  {allHealthy ? '✓ all systems operational' : `⚠ ${totalProviders - healthyCount} provider(s) degraded`}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)', marginTop: 2 }}>
              Insight Copilot · observability dashboard
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)' }}>
              refreshes in {countdown}s
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchStatus() }}
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
      <main style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--ic-font-mono)', fontSize: 13, color: 'var(--ic-muted)' }}>
            Loading status...
          </div>
        )}

        {error && (
          <div style={{
            background: '#ff4d6d14', border: '1px solid #ff4d6d44',
            borderRadius: 10, padding: '20px 24px', marginBottom: 24,
            fontFamily: 'var(--ic-font-mono)', fontSize: 13, color: 'var(--ic-danger)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span>🔌</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Backend unreachable</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>{error}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ic-muted)' }}>
                Run: <code style={{ color: 'var(--ic-accent)' }}>uvicorn main:app --reload --port 8000</code>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── LLM Providers ───────────────────────────────────────── */}
            <section>
              <SectionTitle>LLM Providers — Round-Robin Router</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {data.providers.map(p => (
                  <ProviderCard
                    key={p.name}
                    provider={p}
                    isNext={p.name === data.round_robin_next}
                  />
                ))}
              </div>
              <div style={{
                marginTop: 12, fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)',
                display: 'flex', gap: 16,
              }}>
                <span>Cooldown: {data.config.cooldown_seconds}s</span>
                <span>Max tries per request: {data.config.max_provider_tries}</span>
              </div>
            </section>

            {/* ── Rate Limiter + Cache + History in a row ─────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>

              {/* Rate Limiter */}
              <section>
                <SectionTitle>Rate Limiter (this session)</SectionTitle>
                <Card>
                  <StatRow
                    label="Requests used"
                    value={`${data.session_rate_limit.requests_in_window} / ${data.session_rate_limit.limit}`}
                    valueColor={data.session_rate_limit.remaining === 0 ? 'var(--ic-danger)' : 'var(--ic-text)'}
                  />
                  <StatRow label="Remaining"     value={data.session_rate_limit.remaining}  valueColor={data.session_rate_limit.remaining < 3 ? '#f5a623' : 'var(--ic-accent)'} />
                  <StatRow label="Window"        value={`${data.session_rate_limit.window_seconds}s sliding`} />
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)', marginBottom: 4 }}>
                      USAGE
                    </div>
                    <ProgressBar
                      value={data.session_rate_limit.requests_in_window}
                      max={data.session_rate_limit.limit}
                      color={data.session_rate_limit.remaining === 0 ? 'var(--ic-danger)' : data.session_rate_limit.remaining < 3 ? '#f5a623' : 'var(--ic-accent)'}
                    />
                  </div>
                </Card>
              </section>

              {/* Cache */}
              <section>
                <SectionTitle>Query Cache</SectionTitle>
                <Card>
                  <StatRow label="Active entries"  value={data.cache.active_entries}  valueColor="var(--ic-accent)" />
                  <StatRow label="Expired entries" value={data.cache.expired_entries} />
                  <StatRow label="Total cache hits" value={data.cache.total_hits.toLocaleString()} valueColor={data.cache.total_hits > 0 ? 'var(--ic-accent)' : 'var(--ic-text)'} />
                  <StatRow label="TTL"              value={`${data.cache.ttl_seconds / 60} min`} />
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)', marginBottom: 4 }}>
                      FILL ({data.cache.total_entries} / {data.cache.max_entries})
                    </div>
                    <ProgressBar
                      value={data.cache.total_entries}
                      max={data.cache.max_entries}
                      color="var(--ic-accent2)"
                    />
                  </div>
                </Card>
              </section>

              {/* History */}
              <section>
                <SectionTitle>Query History (this session)</SectionTitle>
                <Card>
                  <StatRow label="Total queries"  value={data.history.total} />
                  <StatRow label="Bookmarked"     value={data.history.bookmarked} valueColor={data.history.bookmarked > 0 ? '#f5a623' : 'var(--ic-text)'} />
                  <StatRow label="Pinned"         value={data.history.pinned}     valueColor={data.history.pinned > 0 ? 'var(--ic-accent)' : 'var(--ic-text)'} />
                  <StatRow label="Table version"  value={`v${data.cache.table_version}`} />
                </Card>
              </section>
            </div>

            {/* ── Config reference ────────────────────────────────────── */}
            <section>
              <SectionTitle>System Configuration</SectionTitle>
              <Card>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}>
                  {[
                    { label: 'Provider cooldown',     value: `${data.config.cooldown_seconds}s` },
                    { label: 'Max provider tries',    value: data.config.max_provider_tries },
                    { label: 'Rate limit window',     value: `${data.config.rate_limit_window_seconds}s` },
                    { label: 'Rate limit max req',    value: data.config.rate_limit_max_requests },
                    { label: 'Cache TTL',             value: `${data.cache.ttl_seconds / 60} min` },
                    { label: 'Cache max entries',     value: data.cache.max_entries },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'var(--ic-surface2)',
                      border: '1px solid var(--ic-border)',
                      borderRadius: 8, padding: '12px 14px',
                    }}>
                      <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 10, color: 'var(--ic-muted)', marginBottom: 6 }}>
                        {item.label.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: 'var(--ic-font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ic-text)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ── Last refresh ─────────────────────────────────────────── */}
            {lastRefresh && (
              <div style={{
                textAlign: 'center',
                fontFamily: 'var(--ic-font-mono)', fontSize: 11, color: 'var(--ic-muted)',
                paddingBottom: 16,
              }}>
                Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every {REFRESH_INTERVAL / 1000}s
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
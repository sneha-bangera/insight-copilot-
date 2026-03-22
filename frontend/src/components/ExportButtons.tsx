'use client'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  question: string
  summary:  string
  sql:      string
  columns:  string[]
  rows:     Record<string, unknown>[]
}

type ExportFormat = 'excel' | 'pdf'

export default function ExportButtons({ question, summary, sql, columns, rows }: Props) {
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setLoading(format)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/export/${format}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, summary, sql, columns, rows }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail?.message || `Export failed`)
      }

      // Trigger browser download
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      const ext      = format === 'excel' ? 'xlsx' : 'pdf'
      const filename = question.slice(0, 40).replace(/[^a-z0-9]/gi, '_').toLowerCase()
      a.href         = url
      a.download     = `${filename}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--ic-font-mono)',
        color: 'var(--ic-muted)', marginBottom: 7,
        letterSpacing: '0.05em',
      }}>EXPORT</div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Excel button */}
        <button
          onClick={() => handleExport('excel')}
          disabled={loading !== null}
          style={{
            background: loading === 'excel' ? 'var(--ic-surface2)' : 'none',
            border: '1px solid var(--ic-border)',
            borderRadius: 6, padding: '5px 12px',
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            color: loading === 'excel' ? 'var(--ic-muted)' : 'var(--ic-text)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#1D9E75' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ic-border)' }}
        >
          <span style={{ fontSize: 13 }}>📊</span>
          {loading === 'excel' ? 'Exporting...' : 'Excel'}
        </button>

        {/* PDF button */}
        <button
          onClick={() => handleExport('pdf')}
          disabled={loading !== null}
          style={{
            background: loading === 'pdf' ? 'var(--ic-surface2)' : 'none',
            border: '1px solid var(--ic-border)',
            borderRadius: 6, padding: '5px 12px',
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            color: loading === 'pdf' ? 'var(--ic-muted)' : 'var(--ic-text)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#D85A30' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ic-border)' }}
        >
          <span style={{ fontSize: 13 }}>📄</span>
          {loading === 'pdf' ? 'Exporting...' : 'PDF'}
        </button>

        {/* Error */}
        {error && (
          <span style={{
            fontFamily: 'var(--ic-font-mono)', fontSize: 11,
            color: 'var(--ic-danger)',
          }}>⚠ {error}</span>
        )}
      </div>
    </div>
  )
}
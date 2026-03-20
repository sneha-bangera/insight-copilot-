'use client'
import { useState } from 'react'

interface Props {
  sql: string
}

export default function SqlExplainer({ sql }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6b6b80',
          fontFamily: 'IBM Plex Mono',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 0',
        }}
      >
        <span style={{ color: '#00d4aa' }}>{open ? '▾' : '▸'}</span>
        {open ? 'hide SQL' : 'view SQL'}
      </button>

      {open && (
        <pre style={{
          marginTop: 8,
          padding: '12px 16px',
          background: '#0a0a0f',
          border: '1px solid #2a2a3a',
          borderRadius: 6,
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
          color: '#00d4aa',
          overflowX: 'auto',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {sql}
        </pre>
      )}
    </div>
  )
}
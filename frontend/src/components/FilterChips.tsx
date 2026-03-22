'use client'

interface Props {
  suggestions: string[]
  onSelect: (question: string) => void
}

export default function FilterChips({ suggestions, onSelect }: Props) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'var(--ic-font-mono)',
        color: 'var(--ic-muted)',
        marginBottom: 7,
        letterSpacing: '0.05em',
      }}>
        FOLLOW UP
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            style={{
              background: 'var(--ic-bg)',
              border: '1px solid var(--ic-border)',
              borderRadius: 20,
              padding: '5px 12px',
              fontFamily: 'var(--ic-font-sans)',
              fontSize: 12,
              color: 'var(--ic-text)',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'border-color 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--ic-accent)'
              e.currentTarget.style.color = 'var(--ic-accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--ic-border)'
              e.currentTarget.style.color = 'var(--ic-text)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
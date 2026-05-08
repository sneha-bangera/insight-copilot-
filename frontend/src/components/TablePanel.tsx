'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchTables, uploadCSV, deleteTable,
  TableInfo, JoinSuggestion,
} from '@/lib/api'

interface Props {
  onJoinSuggest?: (hint: string) => void  // sends a prompt hint to the chat
  onTableChange?: () => void               // notify parent to refresh
}

export default function TablePanel({ onJoinSuggest, onTableChange }: Props) {
  const [tables,      setTables]      = useState<TableInfo[]>([])
  const [joins,       setJoins]       = useState<JoinSuggestion[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchTables()
      setTables(data.tables)
      setJoins(data.join_suggestions)
    } catch (_) {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only .csv files are supported.')
      return
    }
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      const result = await uploadCSV(file)
      setUploadSuccess(
        `"${result.table_name}" loaded — ${result.row_count.toLocaleString()} rows, ${result.columns.length} columns.`
      )
      await load()
      onTableChange?.()
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (tableName: string) => {
    if (!confirm(`Delete table "${tableName}"? This cannot be undone.`)) return
    try {
      await deleteTable(tableName)
      await load()
      onTableChange?.()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed.')
    }
  }

  const mono  = 'var(--ic-font-mono)'
  const sans  = 'var(--ic-font-sans)'
  const muted = 'var(--ic-muted)'
  const border = 'var(--ic-border)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: sans,
    }}>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--ic-accent)' : border}`,
          borderRadius: 10,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          background: dragOver ? 'var(--ic-accent)18' : 'var(--ic-surface)',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={{ fontSize: 22, marginBottom: 6 }}>
          {uploading ? '⏳' : '📂'}
        </div>
        <div style={{ fontSize: 13, color: uploading ? 'var(--ic-accent)' : 'var(--ic-text)', fontWeight: 500 }}>
          {uploading ? 'Uploading...' : 'Drop a CSV or click to upload'}
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
          Max 20 MB · 500k rows · columns auto-detected
        </div>
      </div>

      {/* ── Upload feedback ─────────────────────────────────────────────── */}
      {uploadError && (
        <div style={{
          background: '#ff4d6d14', border: '1px solid #ff4d6d44',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 12, color: 'var(--ic-danger)', fontFamily: mono,
        }}>
          ⚠ {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div style={{
          background: 'var(--ic-accent)14', border: '1px solid var(--ic-accent)44',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 12, color: 'var(--ic-accent)', fontFamily: mono,
        }}>
          ✓ {uploadSuccess}
        </div>
      )}

      {joins.length > 0 && (
        <div style={{
          background: '#7c6af714', border: '1px solid #7c6af744',
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{
            fontSize: 11, fontFamily: mono,
            color: 'var(--ic-accent2)', marginBottom: 8, fontWeight: 600,
          }}>
            JOIN SUGGESTIONS
          </div>
          {joins.map((j, i) => (
            <div key={i} style={{ marginBottom: i < joins.length - 1 ? 10 : 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ic-text)', marginBottom: 4 }}>
                {j.prompt_hint}
              </div>
              <button
                onClick={() => onJoinSuggest?.(
                  `Combine ${j.table_a} and ${j.table_b} using the ${j.join_column} column and show me a summary`
                )}
                style={{
                  background: 'none',
                  border: '1px solid #7c6af744',
                  borderRadius: 6, padding: '4px 10px',
                  fontFamily: mono, fontSize: 11,
                  color: 'var(--ic-accent2)', cursor: 'pointer',
                }}
              >
                Ask about this →
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, fontFamily: mono, color: muted, letterSpacing: '0.05em' }}>
        TABLES ({tables.length})
      </div>

      {tables.length === 0 ? (
        <div style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '8px 0' }}>
          No tables yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tables.map(t => (
            <div key={t.table_name} style={{
              background: 'var(--ic-surface)',
              border: `1px solid ${expanded === t.table_name ? 'var(--ic-accent)' : border}`,
              borderRadius: 8, overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              {/* Table header row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px', cursor: 'pointer',
                }}
                onClick={() => setExpanded(e => e === t.table_name ? null : t.table_name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{t.is_system ? '🗄' : '📋'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: mono, fontWeight: 500, color: 'var(--ic-text)' }}>
                      {t.table_name}
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>
                      {t.row_count.toLocaleString()} rows · {t.columns.length} cols
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.is_system && (
                    <span style={{
                      fontSize: 10, fontFamily: mono,
                      color: 'var(--ic-accent)', background: 'var(--ic-accent)18',
                      padding: '2px 6px', borderRadius: 4,
                    }}>system</span>
                  )}
                  {!t.is_system && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(t.table_name) }}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--ic-danger)', cursor: 'pointer',
                        fontSize: 14, padding: '2px 4px', lineHeight: 1,
                      }}
                      title="Delete table"
                    >×</button>
                  )}
                  <span style={{ fontSize: 11, color: muted }}>
                    {expanded === t.table_name ? '▾' : '▸'}
                  </span>
                </div>
              </div>

              {/* Expanded columns */}
              {expanded === t.table_name && (
                <div style={{
                  borderTop: `1px solid ${border}`,
                  padding: '10px 12px',
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                }}>
                  {t.columns.map(col => (
                    <div key={col.name} style={{
                      background: 'var(--ic-surface2)',
                      border: `1px solid ${border}`,
                      borderRadius: 5, padding: '3px 8px',
                      fontSize: 11, fontFamily: mono,
                    }}>
                      <span style={{ color: 'var(--ic-text)' }}>{col.name}</span>
                      <span style={{ color: muted, marginLeft: 5 }}>{col.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
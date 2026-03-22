'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
}

const COLORS = ['#00d4aa', '#7c6af7', '#ff4d6d', '#f5a623', '#4ecdc4', '#a8e6cf']

function detectChartType(columns: string[], rows: Record<string, unknown>[]): 'bar' | 'line' | 'pie' | 'table' {
  if (rows.length === 0 || columns.length === 0) return 'table'
  const numericCols = columns.filter(c => typeof rows[0][c] === 'number')
  const textCols = columns.filter(c => typeof rows[0][c] === 'string')
  if (numericCols.length === 0) return 'table'
  if (rows.length === 1) return 'table'
  if (textCols.length === 1 && numericCols.length === 1 && rows.length <= 8) return 'pie'
  // If first text col looks like a date/month, use line chart
  const firstText = textCols[0] || ''
  const firstVal = rows[0]?.[firstText] as string || ''
  if (/\d{4}|\bjan\b|\bfeb\b|\bmar\b|\bq[1-4]\b/i.test(firstVal)) return 'line'
  return 'bar'
}

function formatValue(val: unknown): string {
  if (typeof val === 'number') {
    if (val > 1000) return val.toLocaleString('en-IN')
    return String(val)
  }
  return String(val ?? '')
}

export default function ChartDisplay({ columns, rows }: Props) {
  if (!rows.length) return null

  const chartType = detectChartType(columns, rows)
  const textCols = columns.filter(c => typeof rows[0][c] === 'string')
  const numericCols = columns.filter(c => typeof rows[0][c] === 'number')
  const labelKey = textCols[0] || columns[0]

  const tooltipStyle = {
    backgroundColor: '#1a1a24',
    border: '1px solid #2a2a3a',
    borderRadius: '6px',
    color: '#e8e8f0',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '12px',
  }

  if (chartType === 'pie') {
    const valueKey = numericCols[0]
    return (
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={rows}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}              
              labelLine={false}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'line') {
    return (
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey={labelKey} tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <YAxis tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
            {numericCols.map((col, i) => (
              <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'bar') {
    return (
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey={labelKey} tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <YAxis tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
            {numericCols.map((col, i) => (
              <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Table fallback
  return (
    <div style={{ overflowX: 'auto', maxHeight: 240, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #2a2a3a', color: '#6b6b80', fontWeight: 500 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1a1a24' }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '6px 12px', color: '#e8e8f0' }}>
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
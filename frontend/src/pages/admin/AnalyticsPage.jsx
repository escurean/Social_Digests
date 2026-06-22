import { useEffect, useState } from 'react'
import { moderation } from '../../services/api.js'

export default function AdminAnalyticsPage() {
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    moderation.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const CARD_LABELS = [
    'Total users', 'Active topics', 'Total contributions', 'KES raised (active)',
    'Pending proposals', 'Open flags', 'Banned users', 'Active campaigns',
  ]

  const cards = stats ? [
    { label: 'Total users',         value: stats.users?.total?.toLocaleString() ?? '—' },
    { label: 'Active topics',       value: stats.topics?.active?.toLocaleString() ?? '—' },
    { label: 'Total contributions', value: stats.contributions?.total?.toLocaleString() ?? '—' },
    { label: 'KES raised (active)', value: stats.campaigns?.total_raised != null
        ? `KES ${Number(stats.campaigns.total_raised).toLocaleString()}`
        : '—' },
    { label: 'Pending proposals',   value: stats.proposals?.pending?.toLocaleString() ?? '—' },
    { label: 'Open flags',          value: stats.flags?.open?.toLocaleString() ?? '—' },
    { label: 'Banned users',        value: stats.users?.banned?.toLocaleString() ?? '—' },
    { label: 'Active campaigns',    value: stats.campaigns?.total?.toLocaleString() ?? '—' },
  ] : CARD_LABELS.map((label) => ({ label, value: loadError ? '—' : '…' }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Analytics</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>Platform-wide statistics</p>
      </div>

      {loadError && (
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(192,64,0,0.08)', border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--color-terracotta)' }}>
          Failed to load statistics. Check the database connection and try refreshing.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {cards.map((s, i) => (
          <div key={i} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-terracotta)' }}>
              {loading ? '…' : s.value}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { moderation } from '../../services/api.js'

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    moderation.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
  ] : Array(8).fill({ label: '…', value: '…' })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Analytics</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>Platform-wide statistics</p>
      </div>

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

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { moderation } from '../../services/api.js'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    moderation.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const metrics = stats ? [
    { label: 'Active topics',       value: stats.topics?.active ?? '—',      link: '/admin/topics',     alert: false },
    { label: 'Pending proposals',   value: stats.proposals?.pending ?? '—',  link: '/admin/proposals',  alert: (stats.proposals?.pending ?? 0) > 0 },
    { label: 'Flagged content',     value: stats.flags?.open ?? '—',         link: '/admin/moderation', alert: (stats.flags?.open ?? 0) > 0 },
    { label: 'KES raised (active)', value: stats.campaigns?.total_raised != null
        ? `KES ${Number(stats.campaigns.total_raised).toLocaleString()}`
        : '—',                                                                link: '/admin/campaigns',  alert: false },
  ] : [
    { label: 'Active topics', value: '…', link: '/admin/topics', alert: false },
    { label: 'Pending proposals', value: '…', link: '/admin/proposals', alert: false },
    { label: 'Flagged content', value: '…', link: '/admin/moderation', alert: false },
    { label: 'KES raised (active)', value: '…', link: '/admin/campaigns', alert: false },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 28 }}>
        Welcome back. Here's what's happening.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {metrics.map((m) => (
          <Link
            key={m.label}
            to={m.link}
            className="card"
            style={{
              padding: '20px 24px', display: 'block',
              borderLeft: m.alert ? '3px solid var(--color-terracotta)' : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              {m.alert && <span className="status-badge badge-closed">Needs action</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-terracotta)', lineHeight: 1 }}>
              {loading ? '…' : m.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{m.label}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {stats && (
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Platform overview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Total users', stats.users?.total],
                ['Banned users', stats.users?.banned],
                ['Total contributions', stats.contributions?.total],
                ['All topics', stats.topics?.total],
                ['Active campaigns', stats.campaigns?.total],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Create new topic',       '/admin/topics/new'],
              ['Launch campaign',        '/admin/campaigns/new'],
              ['Review proposals',       '/admin/proposals'],
              ['Check moderation queue', '/admin/moderation'],
              ['Manage users',           '/admin/users'],
            ].map(([label, path]) => (
              <Link key={path} to={path} className="btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

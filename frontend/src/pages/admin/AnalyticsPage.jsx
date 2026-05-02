const stats = [
  { label: 'Total users', value: '3,241', change: '+12% this month' },
  { label: 'Active topics', value: '12', change: '2 created this week' },
  { label: 'Contributions', value: '8,904', change: '+340 this week' },
  { label: 'Total donations', value: 'KES 1.2M', change: '+KES 84K this month' },
]

export default function AdminAnalyticsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Analytics</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>Platform-wide statistics</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-terracotta)' }}>{s.value}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-sage)', marginTop: 4 }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {['Signups over time', 'Donations over time'].map((title) => (
          <div key={title} className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</h3>
            <div style={{
              height: 180, background: 'var(--color-light-gray)', borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-muted)', fontSize: 13,
            }}>
              Chart placeholder — connect to analytics API
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

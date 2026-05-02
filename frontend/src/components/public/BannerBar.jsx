import { useEffect, useState } from 'react'
import { banners as bannersApi } from '../../services/api.js'

export default function BannerBar() {
  const [items, setItems] = useState([])
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    bannersApi.listActive()
      .then(({ data }) => setItems(data.banners || []))
      .catch(() => {})
  }, [])

  const visible = items.filter((b) => !dismissed.has(b.id))
  if (visible.length === 0) return null

  return (
    <div>
      {visible.map((b) => (
        <div key={b.id} style={{
          background: 'var(--color-turquoise)',
          color: 'var(--color-text)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontSize: 13,
          fontWeight: 500,
        }}>
          <span>
            <strong>{b.title}</strong>
            {b.body ? ` — ${b.body}` : ''}
          </span>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, b.id]))}
            aria-label="Dismiss"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, opacity: 0.55, padding: '0 4px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

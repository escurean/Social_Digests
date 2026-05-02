import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cmsAdmin } from '../../services/api.js'
import { getPrimaryImageUrl } from '../../utils/strapi.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminCampaignsPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    cmsAdmin.campaigns.list()
      .then(({ data }) => setList(data.campaigns))
      .catch(() => addToast({ message: 'Failed to load campaigns.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (slug, title) => {
    if (!window.confirm(`Delete campaign "${title}"?`)) return
    setDeleting(slug)
    try {
      await cmsAdmin.campaigns.remove(slug)
      setList((prev) => prev.filter((c) => c.slug !== slug))
      addToast({ message: 'Campaign deleted.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to delete.', type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const handleStatusToggle = async (c) => {
    const next = c.status === 'active' ? 'closed' : 'active'
    try {
      const { data } = await cmsAdmin.campaigns.update(c.slug, { status: next })
      setList((prev) => prev.map((item) => item.slug === c.slug ? { ...item, status: data.status ?? next } : item))
      addToast({ message: `Campaign ${next === 'active' ? 'activated' : 'closed'}.`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to update.', type: 'error' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Campaigns</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            {list.length} campaign{list.length !== 1 ? 's' : ''} · managed via Strapi CMS
          </p>
        </div>
        <Link to="/admin/campaigns/new" className="btn-primary">+ New campaign</Link>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No campaigns yet. <Link to="/admin/campaigns/new" style={{ color: 'var(--color-terracotta)' }}>Create one</Link>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => {
            const pct    = Math.min(Number(c.progress_pct) || 0, 100)
            const imgUrl = getPrimaryImageUrl(c, 'small')
            return (
              <div key={c.slug} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span className={`status-badge badge-${c.status}`}>{c.status}</span>
                        {c.deadline && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                            Deadline: {new Date(c.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{c.title}</h3>
                      <div className="progress-bar" style={{ maxWidth: 360, marginBottom: 6 }}>
                        <div className="progress-bar-inner" style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {c.currency} {Number(c.raised_amount ?? 0).toLocaleString()} of {Number(c.goal_amount).toLocaleString()} raised ({pct}%)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Link
                      to={`/admin/campaigns/edit/${c.slug}`}
                      className="btn-secondary"
                      style={{ padding: '7px 14px', minHeight: 34, fontSize: 12 }}
                    >
                      Edit
                    </Link>
                    <button
                      className="btn-secondary"
                      style={{ padding: '7px 14px', minHeight: 34, fontSize: 12 }}
                      onClick={() => handleStatusToggle(c)}
                    >
                      {c.status === 'active' ? 'Close' : 'Activate'}
                    </button>
                    <button
                      style={{
                        padding: '7px 14px', minHeight: 34, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                        border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                      }}
                      disabled={deleting === c.slug}
                      onClick={() => handleDelete(c.slug, c.title)}
                    >
                      {deleting === c.slug ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

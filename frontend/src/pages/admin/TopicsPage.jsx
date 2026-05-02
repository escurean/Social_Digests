import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cmsAdmin } from '../../services/api.js'
import { getPrimaryImageUrl } from '../../utils/strapi.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminTopicsPage() {
  const [topicList, setTopicList] = useState([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    cmsAdmin.topics.list()
      .then(({ data }) => setTopicList(data.topics))
      .catch(() => addToast({ message: 'Failed to load topics.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (slug, title) => {
    if (!window.confirm(`Delete topic "${title}"? This cannot be undone.`)) return
    setDeleting(slug)
    try {
      await cmsAdmin.topics.remove(slug)
      addToast({ message: 'Topic deleted.', type: 'success' })
      setTopicList((prev) => prev.filter((t) => t.slug !== slug))
    } catch {
      addToast({ message: 'Failed to delete topic.', type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleStatus = async (topic) => {
    const next = topic.status === 'active' ? 'closed' : 'active'
    try {
      const { data } = await cmsAdmin.topics.update(topic.slug, { status: next })
      setTopicList((prev) => prev.map((t) => t.slug === topic.slug ? { ...t, status: data.status ?? next } : t))
      addToast({ message: `Topic ${next === 'active' ? 'activated' : 'closed'}.`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to update topic.', type: 'error' })
    }
  }

  const handleToggleFeatured = async (topic) => {
    try {
      const { data } = await cmsAdmin.topics.update(topic.slug, { is_featured: !topic.is_featured })
      setTopicList((prev) => prev.map((t) => t.slug === topic.slug ? { ...t, is_featured: data.is_featured ?? !topic.is_featured } : t))
      addToast({ message: topic.is_featured ? 'Removed from featured.' : 'Pinned as featured.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to update topic.', type: 'error' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Topics</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            {topicList.length} topic{topicList.length !== 1 ? 's' : ''} · managed via Strapi CMS
          </p>
        </div>
        <Link to="/admin/topics/new" className="btn-primary">+ New topic</Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : topicList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No topics yet. <Link to="/admin/topics/new" style={{ color: 'var(--color-terracotta)' }}>Create one</Link>.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Topic', 'Category', 'Status', 'Contributions', 'Featured', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topicList.map((t) => (
                <tr key={t.slug} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {getPrimaryImageUrl(t) && (
                        <img
                          src={getPrimaryImageUrl(t, 'thumbnail')}
                          alt=""
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginTop: 2 }}>{t.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="tag-pill">{t.category_name || t.category_slug || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`status-badge badge-${t.status}`}>{t.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {t.contribution_count ?? 0}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleToggleFeatured(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      title={t.is_featured ? 'Unpin' : 'Pin as featured'}
                    >
                      {t.is_featured ? '★' : '☆'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link
                        to={`/admin/topics/edit/${t.slug}`}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                      >
                        {t.status === 'active' ? 'Close' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.slug, t.title)}
                        disabled={deleting === t.slug}
                        style={{
                          padding: '5px 12px', minHeight: 30, fontSize: 12,
                          background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                          border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        {deleting === t.slug ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

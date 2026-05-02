import { useState, useEffect } from 'react'
import { proposals as proposalsApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminProposalsPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('pending')
  const [acting, setActing]   = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    proposalsApi.list({ status: filter || undefined })
      .then(({ data }) => setItems(data.proposals))
      .catch(() => addToast({ message: 'Failed to load proposals.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const handleApprove = async (id) => {
    setActing(id)
    try {
      const { data } = await proposalsApi.approve(id)
      setItems((prev) => prev.map((p) => p.id === id ? { ...p, status: data.status } : p))
      addToast({ message: 'Proposal approved.', type: 'success' })
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to approve.', type: 'error' })
    } finally {
      setActing(null)
    }
  }

  const handleReject = async () => {
    setActing(rejectId)
    try {
      const { data } = await proposalsApi.reject(rejectId, rejectReason)
      setItems((prev) => prev.map((p) => p.id === rejectId ? { ...p, status: data.status } : p))
      addToast({ message: 'Proposal rejected.', type: 'success' })
      setRejectId(null)
      setRejectReason('')
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to reject.', type: 'error' })
    } finally {
      setActing(null)
    }
  }

  const STATUS_BADGE = { pending: 'badge-pending', approved: 'badge-active', rejected: 'badge-closed' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Topic proposals</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Review and approve community-submitted topic ideas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'approved', 'rejected', ''].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: filter === s ? 'var(--color-sage)' : 'white',
                color: filter === s ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No {filter || ''} proposals.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((p) => (
            <div key={p.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    {p.category_slug && <span className="tag-pill">{p.category_slug}</span>}
                    <span className={`status-badge ${STATUS_BADGE[p.status] || 'badge-draft'}`}>{p.status}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{p.title}</h3>
                  {p.description && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    By {p.user_name} ({p.user_email}) · {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  {p.rejection_reason && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-terracotta)' }}>
                      Rejection note: {p.rejection_reason}
                    </div>
                  )}
                </div>
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '7px 16px', minHeight: 34, fontSize: 13 }}
                      disabled={acting === p.id}
                      onClick={() => handleApprove(p.id)}
                    >
                      {acting === p.id ? '…' : 'Approve'}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '7px 16px', minHeight: 34, fontSize: 13 }}
                      onClick={() => { setRejectId(p.id); setRejectReason('') }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ padding: 28, width: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Reject proposal</h3>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Reason (optional)</label>
              <textarea
                className="form-input" rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this proposal was not accepted…"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setRejectId(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={acting === rejectId}
                onClick={handleReject}
                style={{ background: 'var(--color-terracotta)' }}
              >
                {acting === rejectId ? '…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

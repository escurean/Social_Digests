import { useState, useEffect } from 'react'
import { moderation as moderationApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminModerationPage() {
  const [flags, setFlags]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null)
  const [noteModal, setNoteModal] = useState(null)
  const [note, setNote]         = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    moderationApi.getQueue({ status: 'open' })
      .then(({ data }) => setFlags(data.flags))
      .catch(() => addToast({ message: 'Failed to load moderation queue.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const act = async (action, id) => {
    setActing(id)
    try {
      if (action === 'dismiss') await moderationApi.dismiss(id)
      if (action === 'remove')  await moderationApi.remove(id)
      setFlags((prev) => prev.filter((f) => f.id !== id))
      addToast({ message: action === 'dismiss' ? 'Flag dismissed.' : 'Content removed.', type: 'success' })
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Action failed.', type: 'error' })
    } finally {
      setActing(null)
    }
  }

  const openNote = (id, action) => {
    setNoteModal({ id, action })
    setNote('')
  }

  const submitNote = async () => {
    const { id, action } = noteModal
    setActing(id)
    try {
      if (action === 'warn') await moderationApi.warn(id, note)
      if (action === 'ban')  await moderationApi.ban(id, note)
      setFlags((prev) => prev.filter((f) => f.id !== id))
      addToast({ message: action === 'ban' ? 'User banned.' : 'Warning issued.', type: 'success' })
      setNoteModal(null)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Action failed.', type: 'error' })
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Moderation queue</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
          {loading ? 'Loading…' : `${flags.length} item${flags.length !== 1 ? 's' : ''} need review`}
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : flags.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          All clear — no flagged content.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {flags.map((f) => (
            <div key={f.id} className="card" style={{ padding: 20, borderLeft: '3px solid var(--color-terracotta)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Author: <strong>{f.author_name}</strong> ({f.author_email}) · Topic: <em>{f.topic_slug}</em>
                    <br />
                    Flagged by: <strong>{f.reporter_name}</strong> · Reason: {f.reason}
                    · {new Date(f.created_at).toLocaleDateString()}
                  </div>
                  <p style={{
                    fontSize: 14, lineHeight: 1.5,
                    background: 'var(--color-light-gray)', padding: '10px 14px',
                    borderRadius: 'var(--radius-md)', marginBottom: 0,
                  }}>
                    "{f.contribution_body}"
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', minHeight: 30, fontSize: 12 }}
                    disabled={acting === f.id}
                    onClick={() => act('dismiss', f.id)}
                  >
                    Dismiss
                  </button>
                  <button
                    style={{
                      padding: '6px 12px', minHeight: 30, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: 'rgba(192,64,0,0.12)', color: 'var(--color-terracotta)',
                      border: '1px solid rgba(192,64,0,0.25)', borderRadius: 'var(--radius-sm)',
                    }}
                    disabled={acting === f.id}
                    onClick={() => act('remove', f.id)}
                  >
                    Remove content
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', minHeight: 30, fontSize: 12 }}
                    onClick={() => openNote(f.id, 'warn')}
                  >
                    Warn user
                  </button>
                  <button
                    style={{
                      padding: '6px 12px', minHeight: 30, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: '#2f2f2f', color: 'white',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                    }}
                    onClick={() => openNote(f.id, 'ban')}
                  >
                    Ban user
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {noteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ padding: 28, width: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {noteModal.action === 'ban' ? 'Ban user' : 'Warn user'}
            </h3>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Note (optional)</label>
              <textarea
                className="form-input" rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for this action…"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setNoteModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={acting === noteModal.id}
                onClick={submitNote}
                style={{ background: noteModal.action === 'ban' ? '#2f2f2f' : undefined }}
              >
                {acting === noteModal.id ? '…' : `Confirm ${noteModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

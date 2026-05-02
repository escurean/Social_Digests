import { useState, useEffect } from 'react'
import { moderation as moderationApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminUsersPage() {
  const [userList, setUserList] = useState([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null)
  const [search, setSearch]     = useState('')
  const [noteModal, setNoteModal] = useState(null)
  const [note, setNote]         = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const load = (q) => {
    setLoading(true)
    moderationApi.getUsers({ q: q || undefined })
      .then(({ data }) => setUserList(data.users))
      .catch(() => addToast({ message: 'Failed to load users.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load('') }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load(search)
  }

  const openNote = (user, action) => {
    setNoteModal({ user, action })
    setNote('')
  }

  const submitAction = async () => {
    const { user, action } = noteModal
    setActing(user.id)
    try {
      if (action === 'ban')   await moderationApi.banUser(user.id, note)
      if (action === 'unban') await moderationApi.unbanUser(user.id)
      if (action === 'warn')  await moderationApi.warnUser(user.id, note)

      setUserList((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, is_banned: action === 'ban' ? true : action === 'unban' ? false : u.is_banned } : u
      ))
      addToast({
        message: action === 'ban' ? 'User banned.' : action === 'unban' ? 'User unbanned.' : 'Warning issued.',
        type: 'success',
      })
      setNoteModal(null)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Action failed.', type: 'error' })
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Users</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            {userList.length} user{userList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ width: 220, minHeight: 36 }}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-secondary" type="submit" style={{ minHeight: 36, padding: '0 16px' }}>
            Search
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : userList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name / Email', 'Role', 'Contributions', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: u.is_banned ? 0.6 : 1 }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-badge badge-${u.role === 'admin' ? 'active' : u.role === 'org' ? 'pending' : 'draft'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>{u.contribution_count}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.is_banned
                      ? <span className="status-badge badge-closed">Banned</span>
                      : <span className="status-badge badge-active">Active</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 10px', minHeight: 28, fontSize: 11 }}
                        disabled={acting === u.id}
                        onClick={() => openNote(u, 'warn')}
                      >
                        Warn
                      </button>
                      {u.is_banned ? (
                        <button
                          style={{
                            padding: '5px 10px', minHeight: 28, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(138,154,91,0.12)', color: 'var(--color-sage)',
                            border: '1px solid rgba(138,154,91,0.3)', borderRadius: 'var(--radius-sm)',
                          }}
                          disabled={acting === u.id}
                          onClick={() => openNote(u, 'unban')}
                        >
                          {acting === u.id ? '…' : 'Unban'}
                        </button>
                      ) : (
                        <button
                          style={{
                            padding: '5px 10px', minHeight: 28, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                            border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                          }}
                          disabled={acting === u.id || u.role === 'admin'}
                          onClick={() => openNote(u, 'ban')}
                        >
                          {acting === u.id ? '…' : 'Ban'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {noteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ padding: 28, width: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {noteModal.action === 'ban' ? 'Ban' : noteModal.action === 'unban' ? 'Unban' : 'Warn'} {noteModal.user.name}
            </h3>
            {noteModal.action !== 'unban' && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Note (optional)</label>
                <textarea
                  className="form-input" rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setNoteModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={acting === noteModal.user.id}
                onClick={submitAction}
                style={{ background: noteModal.action === 'ban' ? '#2f2f2f' : noteModal.action === 'unban' ? 'var(--color-sage)' : undefined }}
              >
                {acting === noteModal.user.id ? '…' : `Confirm ${noteModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

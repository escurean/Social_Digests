import { useState, useEffect } from 'react'
import { banners as bannersApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

const EMPTY_FORM = { title: '', body: '', is_active: false, starts_at: '', ends_at: '' }

export default function AdminBannersPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'new' | banner object
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    bannersApi.list()
      .then(({ data }) => setList(data.banners))
      .catch(() => addToast({ message: 'Failed to load banners.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => { setForm(EMPTY_FORM); setModal('new') }
  const openEdit = (b) => {
    setForm({
      title: b.title,
      body: b.body || '',
      is_active: b.is_active,
      starts_at: b.starts_at ? b.starts_at.slice(0, 10) : '',
      ends_at:   b.ends_at   ? b.ends_at.slice(0, 10)   : '',
    })
    setModal(b)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      starts_at: form.starts_at || null,
      ends_at:   form.ends_at   || null,
    }
    try {
      if (modal === 'new') {
        const { data } = await bannersApi.create(payload)
        setList((prev) => [data, ...prev])
        addToast({ message: 'Banner created.', type: 'success' })
      } else {
        const { data } = await bannersApi.update(modal.id, payload)
        setList((prev) => prev.map((b) => b.id === modal.id ? data : b))
        addToast({ message: 'Banner updated.', type: 'success' })
      }
      setModal(null)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (b) => {
    setToggling(b.id)
    try {
      const { data } = await bannersApi.toggle(b.id)
      setList((prev) => prev.map((item) => item.id === b.id ? data : item))
      addToast({ message: data.is_active ? 'Banner activated.' : 'Banner deactivated.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to toggle banner.', type: 'error' })
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return
    setDeleting(b.id)
    try {
      await bannersApi.remove(b.id)
      setList((prev) => prev.filter((item) => item.id !== b.id))
      addToast({ message: 'Banner deleted.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to delete.', type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Banners</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Manage homepage announcement banners
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ New banner</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No banners yet. <button className="btn-secondary" onClick={openNew} style={{ marginLeft: 8 }}>Create one</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((b) => (
            <div
              key={b.id}
              className="card"
              style={{ padding: 20, borderLeft: `3px solid ${b.is_active ? 'var(--color-sage)' : 'var(--color-border)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span className={`status-badge badge-${b.is_active ? 'active' : 'draft'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{b.title}</h3>
                  {b.body && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>{b.body}</p>}
                  {(b.starts_at || b.ends_at) && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Scheduled: {b.starts_at ? b.starts_at.slice(0, 10) : '—'} → {b.ends_at ? b.ends_at.slice(0, 10) : '—'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', minHeight: 30, fontSize: 12 }}
                    onClick={() => openEdit(b)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', minHeight: 30, fontSize: 12 }}
                    disabled={toggling === b.id}
                    onClick={() => handleToggle(b)}
                  >
                    {toggling === b.id ? '…' : b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    style={{
                      padding: '6px 12px', minHeight: 30, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                      border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                    }}
                    disabled={deleting === b.id}
                    onClick={() => handleDelete(b)}
                  >
                    {deleting === b.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ padding: 28, width: 480 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
              {modal === 'new' ? 'New banner' : 'Edit banner'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required placeholder="Banner headline"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Body text</label>
                <textarea
                  className="form-input" rows={2}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Optional supporting text"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Start date</label>
                  <input
                    className="form-input" type="date"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End date</label>
                  <input
                    className="form-input" type="date"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox" id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" style={{ fontSize: 14, cursor: 'pointer' }}>Active (show on site)</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'new' ? 'Create' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

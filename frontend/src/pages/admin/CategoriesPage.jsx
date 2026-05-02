import { useState, useEffect } from 'react'
import { categories as categoriesApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminCategoriesPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ slug: '', name: '', description: '' })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    categoriesApi.list()
      .then(({ data }) => setList(data.categories))
      .catch(() => addToast({ message: 'Failed to load categories.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => { setForm({ slug: '', name: '', description: '' }); setEditing(null); setShowNew(true) }
  const openEdit = (c) => { setForm({ slug: c.slug, name: c.name, description: c.description || '' }); setEditing(c.slug); setShowNew(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { data } = await categoriesApi.update(editing, { name: form.name, description: form.description })
        setList((prev) => prev.map((c) => c.slug === editing ? { ...c, ...data } : c))
        addToast({ message: 'Category updated.', type: 'success' })
      } else {
        const { data } = await categoriesApi.create(form)
        setList((prev) => [...prev, { ...data, topic_count: 0 }])
        addToast({ message: 'Category created.', type: 'success' })
      }
      setShowNew(false)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slug, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return
    setDeleting(slug)
    try {
      await categoriesApi.remove(slug)
      setList((prev) => prev.filter((c) => c.slug !== slug))
      addToast({ message: 'Category deleted.', type: 'success' })
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
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Categories</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>Manage topic categories</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ New category</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Slug', 'Description', 'Topics', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.slug} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>{c.slug}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 240 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {c.description || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.topic_count ?? 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          padding: '5px 12px', minHeight: 30, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                          border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                        }}
                        disabled={deleting === c.slug}
                        onClick={() => handleDelete(c.slug, c.name)}
                      >
                        {deleting === c.slug ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ padding: 28, width: 420 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {editing ? 'Edit category' : 'New category'}
            </h3>
            <form onSubmit={handleSave}>
              {!editing && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Slug *</label>
                  <input
                    className="form-input"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    required placeholder="e.g. water-sanitation"
                  />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required placeholder="e.g. Water & Sanitation"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description…"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

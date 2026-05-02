import { useState, useEffect } from 'react'
import { staticPages as pagesApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

const EMPTY_FORM = { slug: '', title: '', content: '', show_in_footer: false }

export default function AdminPagesPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'new' | page object
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    pagesApi.list()
      .then(({ data }) => setList(data.pages))
      .catch(() => addToast({ message: 'Failed to load pages.', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => { setForm(EMPTY_FORM); setModal('new') }

  const openEdit = async (p) => {
    try {
      const { data } = await pagesApi.get(p.slug)
      setForm({ slug: data.slug, title: data.title, content: data.content, show_in_footer: data.show_in_footer })
      setModal(data)
    } catch {
      addToast({ message: 'Failed to load page content.', type: 'error' })
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'new') {
        const { data } = await pagesApi.create(form)
        setList((prev) => [...prev, data])
        addToast({ message: 'Page created.', type: 'success' })
      } else {
        const { data } = await pagesApi.update(modal.slug, {
          title: form.title,
          content: form.content,
          show_in_footer: form.show_in_footer,
        })
        setList((prev) => prev.map((p) => p.slug === modal.slug ? { ...p, ...data } : p))
        addToast({ message: 'Page saved.', type: 'success' })
      }
      setModal(null)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to save page.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete page "${p.title}"?`)) return
    setDeleting(p.slug)
    try {
      await pagesApi.remove(p.slug)
      setList((prev) => prev.filter((item) => item.slug !== p.slug))
      addToast({ message: 'Page deleted.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to delete.', type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const handleFooterToggle = async (p) => {
    try {
      const { data } = await pagesApi.update(p.slug, { show_in_footer: !p.show_in_footer })
      setList((prev) => prev.map((item) => item.slug === p.slug ? { ...item, show_in_footer: data.show_in_footer } : item))
    } catch {
      addToast({ message: 'Failed to update.', type: 'error' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Pages</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Edit static pages like About Us, Privacy Policy, and Community Guidelines
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ New page</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Page', 'Slug', 'In footer', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.slug} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14 }}>{p.title}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>{p.slug}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleFooterToggle(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <span className={`status-badge badge-${p.show_in_footer ? 'active' : 'draft'}`}>
                        {p.show_in_footer ? 'Yes' : 'No'}
                      </span>
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          padding: '5px 12px', minHeight: 30, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                          border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                        }}
                        disabled={deleting === p.slug}
                        onClick={() => handleDelete(p)}
                      >
                        {deleting === p.slug ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div className="card" style={{ padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                {modal === 'new' ? 'New page' : `Edit: ${modal.title}`}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)' }}
                onClick={() => setModal(null)}
              >×</button>
            </div>
            <form onSubmit={handleSave}>
              {modal === 'new' && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Slug * (URL-friendly, e.g. about-us)</label>
                  <input
                    className="form-input"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    required placeholder="about-us"
                  />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required placeholder="Page title"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">
                  Content
                  <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                    Supports Markdown (## headings, **bold**, *italic*, - lists)
                  </span>
                </label>
                <textarea
                  className="form-input"
                  rows={14}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="## Page heading&#10;&#10;Your content here…"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox" id="footer"
                  checked={form.show_in_footer}
                  onChange={(e) => setForm({ ...form, show_in_footer: e.target.checked })}
                />
                <label htmlFor="footer" style={{ fontSize: 14, cursor: 'pointer' }}>Show in footer navigation</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'new' ? 'Create page' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

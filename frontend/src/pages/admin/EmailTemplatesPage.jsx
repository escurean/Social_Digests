import { useState, useEffect } from 'react'
import { emailTemplates as templatesApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminEmailTemplatesPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(null)   // template object or null
  const [form, setForm]         = useState({ subject: '', body_html: '', description: '' })
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    templatesApi.list()
      .then(({ data }) => setList(data.templates))
      .catch(() => addToast({ message: 'Failed to load templates.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const openEdit = async (t) => {
    try {
      const { data } = await templatesApi.get(t.key)
      setForm({ subject: data.subject, body_html: data.body_html || '', description: data.description || '' })
      setEditing(data)
    } catch {
      addToast({ message: 'Failed to load template.', type: 'error' })
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await templatesApi.update(editing.key, form)
      setList((prev) => prev.map((t) => t.key === editing.key ? { ...t, ...data } : t))
      addToast({ message: 'Template saved.', type: 'success' })
      setEditing(null)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t) => {
    setToggling(t.key)
    try {
      const { data } = await templatesApi.toggle(t.key)
      setList((prev) => prev.map((item) => item.key === t.key ? { ...item, is_active: data.is_active } : item))
      addToast({ message: data.is_active ? 'Template enabled.' : 'Template disabled.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to toggle template.', type: 'error' })
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Email templates</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
          Edit email subjects and bodies. Use <code style={{ fontSize: 12 }}>{'{{variable}}'}</code> for dynamic content.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Template', 'Subject', 'Status', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.key}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{t.description}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-badge badge-${t.is_active ? 'active' : 'draft'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 12px', minHeight: 30, fontSize: 12 }}
                        disabled={toggling === t.key}
                        onClick={() => handleToggle(t)}
                      >
                        {toggling === t.key ? '…' : t.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div className="card" style={{ padding: 28, width: '100%', maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Edit template: {editing.key}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)' }}
                onClick={() => setEditing(null)}
              >×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What triggers this email"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Subject line *</label>
                <input
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required placeholder="Email subject"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">
                  Body HTML
                  <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                    Supports HTML · Use {'{{variable}}'} for dynamic values
                  </span>
                </label>
                <textarea
                  className="form-input"
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  value={form.body_html}
                  onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                  placeholder="<p>Dear {{user_name}},</p>"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

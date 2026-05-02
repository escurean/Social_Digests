import { useState, useEffect, useRef } from 'react'
import { siteSettings as settingsApi } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    platform_name: '',
    tagline: '',
    primary_color: '#C04000',
    support_email: '',
    footer_text: '',
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    settingsApi.get()
      .then(({ data }) => {
        setForm({
          platform_name: data.platform_name || 'Social Digests',
          tagline:       data.tagline       || '',
          primary_color: data.primary_color || '#C04000',
          support_email: data.support_email || '',
          footer_text:   data.footer_text   || '',
        })
        if (data.logo_url) setLogoPreview(data.logo_url)
      })
      .catch(() => addToast({ message: 'Failed to load settings.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsApi.update(form)
      addToast({ message: 'Settings saved.', type: 'success' })
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to save settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast({ message: 'Please select an image file.', type: 'error' })
      return
    }
    if (file.size > 900_000) {
      addToast({ message: 'Image must be under ~900 KB.', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setLogoPreview(dataUrl)
      setUploadingLogo(true)
      try {
        await settingsApi.uploadLogo(dataUrl)
        addToast({ message: 'Logo uploaded.', type: 'success' })
      } catch (err) {
        addToast({ message: err.response?.data?.error || 'Logo upload failed.', type: 'error' })
        setLogoPreview(null)
      } finally {
        setUploadingLogo(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = async () => {
    if (!window.confirm('Remove the current logo?')) return
    setUploadingLogo(true)
    try {
      await settingsApi.update({ logo_url: null })
      setLogoPreview(null)
      addToast({ message: 'Logo removed.', type: 'success' })
    } catch {
      addToast({ message: 'Failed to remove logo.', type: 'error' })
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Site settings</h1>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Site settings</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
          Manage platform name, branding, and global settings
        </p>
      </div>

      <form className="card" style={{ padding: 28, maxWidth: 620 }} onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="platform_name">Platform name</label>
          <input
            id="platform_name" className="form-input"
            value={form.platform_name}
            onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="tagline">Tagline</label>
          <input
            id="tagline" className="form-input"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="Conversations that move communities."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="primary_color">Primary colour</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color" id="primary_color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                style={{ width: 44, height: 38, border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              />
              <input
                className="form-input"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                style={{ flex: 1 }}
                placeholder="#C04000"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="support_email">Support email</label>
            <input
              id="support_email" className="form-input" type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 28 }}>
          <label className="form-label" htmlFor="footer_text">Footer text</label>
          <input
            id="footer_text" className="form-input"
            value={form.footer_text}
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
          />
        </div>

        {/* Logo upload */}
        <div style={{ marginBottom: 28 }}>
          <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Logo</label>

          {logoPreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src={logoPreview}
                alt="Site logo"
                style={{ maxHeight: 72, maxWidth: 200, objectFit: 'contain', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 8, background: 'white' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 14px', minHeight: 32, fontSize: 12 }}
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingLogo ? 'Uploading…' : 'Replace logo'}
                </button>
                <button
                  type="button"
                  style={{
                    padding: '6px 14px', minHeight: 32, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(192,64,0,0.08)', color: 'var(--color-terracotta)',
                    border: '1px solid rgba(192,64,0,0.2)', borderRadius: 'var(--radius-sm)',
                  }}
                  disabled={uploadingLogo}
                  onClick={handleRemoveLogo}
                >
                  Remove logo
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                padding: 24, textAlign: 'center', cursor: uploadingLogo ? 'default' : 'pointer',
                color: 'var(--color-text-muted)', fontSize: 13,
                background: 'var(--color-light-gray)',
              }}
              onClick={() => !uploadingLogo && fileInputRef.current?.click()}
            >
              {uploadingLogo ? (
                'Uploading…'
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>+</div>
                  Click to upload logo image
                  <div style={{ fontSize: 11, marginTop: 4 }}>PNG, JPG, SVG · Max ~900 KB</div>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoFile}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={saving} style={{ padding: '11px 28px' }}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}

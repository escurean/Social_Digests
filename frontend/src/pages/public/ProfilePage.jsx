import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { users as usersApi } from '../../services/api.js'
import useAuthStore from '../../store/authStore.js'
import useToastStore from '../../store/toastStore.js'

export default function ProfilePage() {
  const { id } = useParams()
  const [profile, setProfile]         = useState(null)
  const [contributions, setContribs]  = useState([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState(false)
  const [form, setForm]               = useState({ name: '', bio: '' })
  const [saving, setSaving]           = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const updateUser  = useAuthStore((s) => s.updateUser)
  const addToast    = useToastStore((s) => s.addToast)

  const isOwn = String(currentUser?.id) === String(id)

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(id),
      usersApi.getContributions(id),
    ]).then(([profileRes, contribRes]) => {
      setProfile(profileRes.data)
      setContribs(contribRes.data.contributions)
      setForm({ name: profileRes.data.name, bio: profileRes.data.bio || '' })
    }).catch(() => {
      addToast({ message: 'Failed to load profile.', type: 'error' })
    }).finally(() => setLoading(false))
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await usersApi.updateProfile(id, form)
      setProfile((p) => ({ ...p, ...data }))
      if (isOwn) updateUser(data)
      setEditing(false)
      addToast({ message: 'Profile updated.', type: 'success' })
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to update.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 80, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page-enter" style={{ padding: 80, textAlign: 'center' }}>
        User not found. <Link to="/">Go home</Link>
      </div>
    )
  }

  const initial = profile.name?.[0]?.toUpperCase() || '?'

  return (
    <div className="page-enter">
      <div style={{ background: 'var(--color-terracotta)', padding: '40px 24px 32px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 28, fontWeight: 600,
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : initial}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: 'white' }}>{profile.name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
                {profile.contribution_count} contribution{profile.contribution_count !== 1 ? 's' : ''} ·
                Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              {profile.bio && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6, maxWidth: 500 }}>
                  {profile.bio}
                </p>
              )}
            </div>
            {isOwn && !editing && (
              <button
                className="btn-secondary"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
                onClick={() => setEditing(true)}
              >
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {editing && (
            <div className="card" style={{ padding: 24, marginBottom: 28, maxWidth: 540 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit profile</h2>
              <form onSubmit={handleSave}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Bio</label>
                  <textarea
                    className="form-input" rows={3}
                    placeholder="Tell the community about yourself…"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Contributions ({profile.contribution_count})
          </h2>

          {contributions.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No contributions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contributions.map((c) => (
                <div key={c.id} className="card" style={{ padding: 16 }}>
                  {c.topic_title && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      In <Link to={`/topics/${c.topic_slug}`} style={{ color: 'var(--color-terracotta)' }}>{c.topic_title}</Link>
                      · {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  )}
                  <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    {c.reaction_count} reaction{c.reaction_count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

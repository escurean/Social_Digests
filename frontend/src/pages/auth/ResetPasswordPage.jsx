import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirm) {
      addToast({ message: 'Passwords do not match.', type: 'error' })
      return
    }

    if (!token) {
      addToast({ message: 'Reset token is missing. Please use the link from your email.', type: 'error' })
      return
    }

    setLoading(true)
    try {
      await auth.resetPassword({ token, password })
      addToast({ message: 'Password reset successfully. Please sign in.', type: 'success' })
      navigate('/auth/login')
    } catch (err) {
      addToast({
        message: err.response?.data?.error || 'Failed to reset password. The link may have expired.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-off-white)', padding: 24 }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: 36, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Invalid link</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
            This reset link is missing its token. Please use the link directly from your email.
          </p>
          <Link to="/auth/forgot-password" style={{ color: 'var(--color-terracotta)', fontWeight: 600, fontSize: 14 }}>
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-off-white)', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 36 }}>
        <Link to="/" style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-terracotta)', display: 'block', marginBottom: 24 }}>
          Social Digests
        </Link>

        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Set new password</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
          Must be at least 12 characters.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="password">New password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={12}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <Link to="/auth/login" style={{ display: 'block', marginTop: 20, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}

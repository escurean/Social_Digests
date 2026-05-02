import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch {
      addToast({ message: 'Failed to send reset email. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-off-white)', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 36 }}>
        <Link to="/" style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-terracotta)', display: 'block', marginBottom: 24 }}>
          Social Digests
        </Link>

        {sent ? (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Check your email</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              We've sent a password reset link to <strong>{email}</strong>. Check your inbox.
            </p>
            <Link to="/auth/login" style={{ display: 'block', marginTop: 20, color: 'var(--color-terracotta)', fontWeight: 600, fontSize: 14 }}>
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Reset password</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <Link to="/auth/login" style={{ display: 'block', marginTop: 20, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

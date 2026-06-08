import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api.js'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link.')
      return
    }

    api.get(`/api/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'This link is invalid or has expired.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-off-white)', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 36, textAlign: 'center' }}>
        <Link to="/" style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-terracotta)', display: 'block', marginBottom: 24 }}>
          Social Digests
        </Link>

        {status === 'verifying' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Verifying your email…</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Email verified</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Your email address has been verified. You're all set.
            </p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
              Go to home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Verification failed</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {message}
            </p>
            <Link to="/auth/login" style={{ color: 'var(--color-terracotta)', fontWeight: 600, fontSize: 14 }}>
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

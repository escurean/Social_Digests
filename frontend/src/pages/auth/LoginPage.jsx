import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../../services/api.js'
import useAuthStore from '../../store/authStore.js'
import useToastStore from '../../store/toastStore.js'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'
  const googleBtnRef = useRef(null)

  const handleSuccess = (user, token) => {
    login(user, token)
    addToast({ message: `Welcome back, ${user.name}!`, type: 'success' })
    navigate(from, { replace: true })
  }

  // Google Identity Services button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError('')
          setLoading(true)
          try {
            const { data } = await auth.google(credential)
            handleSuccess(data.user, data.accessToken)
          } catch (err) {
            setError(err.response?.data?.error || 'Google sign-in failed.')
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 360,
        text: 'signin_with',
      })
    }
    render()
    const t = setTimeout(render, 800)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await auth.login(form)
      handleSuccess(data.user, data.accessToken)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Brand panel */}
      <div className="auth-brand" style={{
        flex: 1, background: 'var(--color-terracotta)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48,
      }}>
        <div style={{ maxWidth: 460 }}>
          <Link to="/" style={{ color: 'white', fontWeight: 600, fontSize: 22, display: 'block', marginBottom: 24 }}>
            ← Social Digests
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 1.6 }}>
            Conversations that move communities.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 16, lineHeight: 1.7 }}>
            Join thousands of community members discussing the issues that matter and funding campaigns for real change.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div style={{
        width: 820, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, background: 'var(--color-off-white)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Sign in</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 28 }}>
            Don't have an account?{' '}
            <Link to="/auth/register" style={{ color: 'var(--color-terracotta)', fontWeight: 600 }}>Join</Link>
          </p>

          {/* Google button */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div ref={googleBtnRef} style={{ width: '100%', minHeight: 44, marginBottom: 16 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: 'rgba(192,64,0,0.08)', border: '1px solid rgba(192,64,0,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              color: 'var(--color-terracotta)', fontSize: 13, marginBottom: 20,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email" className="form-input" type="email" autoComplete="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required style={{ paddingRight: 46 }}
                />
                <button
                  type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '999px', color: 'var(--color-text-muted)',
                  }}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58"/><path d="M9.88 5.09A10.5 10.5 0 0 1 12 5c7 0 10 7 10 7a19.2 19.2 0 0 1-4.1 5.3"/><path d="M6.61 6.61A19.3 19.3 0 0 0 2 12s3 7 10 7a10.5 10.5 0 0 0 4.2-.84"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link to="/auth/forgot-password" style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                Forgot password?
              </Link>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .auth-brand { display: none !important; }
        }
      `}</style>
    </div>
  )
}

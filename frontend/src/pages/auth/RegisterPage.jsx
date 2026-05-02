import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../../services/api.js'
import useAuthStore from '../../store/authStore.js'
import useToastStore from '../../store/toastStore.js'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { login } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)

  const handleSuccess = (user, token) => {
    login(user, token)
    addToast({ message: `Welcome to Social Digests, ${user.name}!`, type: 'success' })
    navigate('/')
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setErrors({})
          setLoading(true)
          try {
            const { data } = await auth.google(credential)
            handleSuccess(data.user, data.token)
          } catch (err) {
            setErrors({ submit: err.response?.data?.error || 'Google sign-up failed.' })
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 360,
        text: 'signup_with',
      })
    }
    render()
    const t = setTimeout(render, 800)
    return () => clearTimeout(t)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!form.email.includes('@')) e.email = 'Enter a valid email.'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setErrors({})
    setLoading(true)
    try {
      const { data } = await auth.register({ name: form.name, email: form.email, password: form.password })
      handleSuccess(data.user, data.token)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const field = (id, label, type = 'text', autoComplete, options = {}) => (
    <div className="form-group" style={{ marginBottom: 16 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} className="form-input"
          type={options.visible ? 'text' : type}
          autoComplete={autoComplete}
          value={form[id]}
          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
          style={{
            ...(errors[id] ? { borderColor: 'var(--color-terracotta)' } : {}),
            ...(options.toggle ? { paddingRight: 46 } : {}),
          }}
        />
        {options.toggle && (
          <button
            type="button" onClick={options.onToggle}
            aria-label={options.visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '999px', color: 'var(--color-text-muted)',
            }}
          >
            {options.visible ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58"/><path d="M9.88 5.09A10.5 10.5 0 0 1 12 5c7 0 10 7 10 7a19.2 19.2 0 0 1-4.1 5.3"/><path d="M6.61 6.61A19.3 19.3 0 0 0 2 12s3 7 10 7a10.5 10.5 0 0 0 4.2-.84"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
      {errors[id] && <span className="form-error">{errors[id]}</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="auth-brand" style={{
        flex: 1, background: 'var(--color-terracotta)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48,
      }}>
        <div style={{ maxWidth: 460 }}>
          <Link to="/" style={{ color: 'white', fontWeight: 600, fontSize: 22, display: 'block', marginBottom: 24 }}>
            ← Social Digests
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 1.6 }}>
            Join the conversation. Make a difference.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 16, lineHeight: 1.7 }}>
            Social Digests is a community platform where your voice shapes policy debates and your donations fund real change.
          </p>
          <ul style={{ marginTop: 24, paddingLeft: 20, lineHeight: 1.5 }}>
            {[
              'Contribute to active community discussions',
              'Propose topics for the community to debate',
              'Donate via M-Pesa or card to fund campaigns you care about',
              'Track the impact of every campaign you support',
            ].map((item) => (
              <li key={item} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ width: 820, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--color-off-white)' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Create account</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 28 }}>
            Already have an account?{' '}
            <Link to="/auth/login" style={{ color: 'var(--color-terracotta)', fontWeight: 600 }}>Sign in</Link>
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

          {errors.submit && (
            <div style={{
              background: 'rgba(192,64,0,0.08)', border: '1px solid rgba(192,64,0,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              color: 'var(--color-terracotta)', fontSize: 13, marginBottom: 20,
            }}>{errors.submit}</div>
          )}

          <form onSubmit={handleSubmit}>
            {field('name', 'Full name', 'text', 'name')}
            {field('email', 'Email', 'email', 'email')}
            {field('password', 'Password', 'password', 'new-password', {
              toggle: true, visible: showPassword, onToggle: () => setShowPassword((v) => !v),
            })}
            {field('confirm', 'Confirm password', 'password', 'new-password', {
              toggle: true, visible: showConfirm, onToggle: () => setShowConfirm((v) => !v),
            })}

            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}>
              {loading ? 'Creating account…' : 'Create account'}
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

import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore.js'
import { auth } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

const navStyle = {
  background: 'var(--color-terracotta)',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
}

const brandStyle = {
  color: 'white',
  fontSize: '18px',
  fontWeight: 600,
  textDecoration: 'none',
  marginRight: 'auto',
  letterSpacing: '-0.01em',
}

const navLinkStyle = {
  color: 'rgba(255,255,255,0.85)',
  fontSize: '14px',
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: 'var(--radius-md)',
  transition: 'color var(--transition-fast), background-color var(--transition-fast)',
}

const activeNavLinkStyle = {
  color: 'white',
  backgroundColor: 'rgba(255,255,255,0.12)',
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const handleLogout = async () => {
    try {
      await auth.logout()
    } catch {
      // ignore
    }
    logout()
    addToast({ message: 'Signed out.', type: 'info' })
    navigate('/')
  }

  const getLinkStyle = ({ isActive }) =>
    isActive ? { ...navLinkStyle, ...activeNavLinkStyle } : navLinkStyle

  return (
    <nav style={navStyle}>
      <Link to="/" style={brandStyle}>Social Digests</Link>

      {/* Desktop links */}
      <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavLink to="/topics" style={getLinkStyle}>Topics</NavLink>
        <NavLink to="/campaigns" style={getLinkStyle}>Campaigns</NavLink>
      </div>

      {/* Desktop auth */}
      <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
        {isAuthenticated ? (
          <>
            {user?.role === 'admin' && (
              <NavLink to="/admin" style={getLinkStyle}>Admin</NavLink>
            )}
            <Link to={`/profile/${user?.id}`} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 600, fontSize: 13,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Link>
            <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 14px', minHeight: 34, fontSize: 13 }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/auth/login" style={navLinkStyle}>Sign in</Link>
            <Link to="/auth/register" className="btn-primary" style={{ padding: '6px 16px', minHeight: 34, fontSize: 13 }}>
              Join
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className="nav-mobile"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        style={{ color: 'white', fontSize: 22, lineHeight: 1, padding: '8px', minWidth: 44, minHeight: 44 }}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile" style={{
          position: 'absolute', top: '60px', left: 0, right: 0,
          background: 'var(--color-terracotta-dark)',
          padding: '8px 16px 16px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          <NavLink to="/topics" style={getLinkStyle} onClick={() => setMenuOpen(false)}>Topics</NavLink>
          <NavLink to="/campaigns" style={getLinkStyle} onClick={() => setMenuOpen(false)}>Campaigns</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to={`/profile/${user?.id}`} style={getLinkStyle} onClick={() => setMenuOpen(false)}>Profile</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" style={getLinkStyle} onClick={() => setMenuOpen(false)}>Admin</NavLink>
              )}
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} style={{ ...navLinkStyle, textAlign: 'left' }}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/auth/login" style={getLinkStyle} onClick={() => setMenuOpen(false)}>Sign in</NavLink>
              <NavLink to="/auth/register" style={getLinkStyle} onClick={() => setMenuOpen(false)}>Join</NavLink>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
        @media (min-width: 601px) {
          .nav-desktop { display: flex !important; }
          .nav-mobile { display: none !important; }
        }
      `}</style>
    </nav>
  )
}

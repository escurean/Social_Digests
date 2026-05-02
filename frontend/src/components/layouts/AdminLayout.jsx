import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore.js'
import { auth } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

const navItems = [
  { label: 'Dashboard',       icon: '📊', path: '/admin',              end: true },
  { label: 'Topics',          icon: '📝', path: '/admin/topics' },
  { label: 'Categories',      icon: '🏷',  path: '/admin/categories' },
  { label: 'Proposals',       icon: '💡', path: '/admin/proposals' },
  { label: 'Campaigns',       icon: '🎯', path: '/admin/campaigns' },
  { label: 'Banners',         icon: '📢', path: '/admin/banners' },
  { label: 'Pages',           icon: '📄', path: '/admin/pages' },
  { label: 'Email templates', icon: '✉️',  path: '/admin/email-templates' },
  { label: 'Moderation',      icon: '🚩', path: '/admin/moderation' },
  { label: 'Users',           icon: '👥', path: '/admin/users' },
  { label: 'Site settings',   icon: '⚙️',  path: '/admin/settings' },
  { label: 'Analytics',       icon: '📈', path: '/admin/analytics' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const handleLogout = async () => {
    try { await auth.logout() } catch { /* ignore */ }
    logout()
    addToast({ message: 'Signed out.', type: 'info' })
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--color-terracotta)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Social Digests</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>Admin panel</div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'white' : 'rgba(255,255,255,0.72)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                marginBottom: 2,
                borderLeft: isActive ? '3px solid var(--color-turquoise)' : '3px solid transparent',
                backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                transition: 'background-color var(--transition-fast), color var(--transition-fast)',
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>
            {user?.name}
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '6px', minHeight: 32 }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        background: 'var(--color-off-white)',
        padding: '28px 32px',
        minWidth: 0,
      }}>
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 600px) {
          aside {
            position: static !important;
            height: auto !important;
            width: 100% !important;
            flex-direction: row !important;
          }
          aside nav {
            display: flex;
            flex-wrap: wrap;
            padding: 8px;
          }
          div[style*="display: flex; min-height"] {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

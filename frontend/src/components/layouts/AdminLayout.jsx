import { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try { await auth.logout() } catch { /* ignore */ }
    logout()
    addToast({ message: 'Signed out.', type: 'info' })
    navigate('/')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      {/* Backdrop — clicks outside the drawer close it on mobile */}
      {sidebarOpen && (
        <div className="admin-backdrop" onClick={closeSidebar} />
      )}

      <div className="admin-shell">
        {/* ── Sidebar ── */}
        <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
          <div className="admin-sidebar-logo">
            <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Social Digests</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>Admin panel</div>
          </div>

          <nav className="admin-sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeSidebar}
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

          <div className="admin-sidebar-footer">
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>
              {user?.name}
            </div>
            <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '6px', minHeight: 32 }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="admin-main">
          {/* Mobile topbar — hidden on desktop */}
          <div className="admin-topbar">
            <button
              className="admin-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span /><span /><span />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Admin</span>
          </div>

          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        /* ── Layout shell ── */
        .admin-shell {
          display: flex;
          min-height: 100vh;
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          width: 240px;
          background: var(--color-terracotta);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .admin-sidebar-logo {
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
        }
        .admin-sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          overflow-y: auto;
        }
        .admin-sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.12);
        }

        /* ── Main content ── */
        .admin-main {
          flex: 1;
          background: var(--color-off-white);
          padding: 28px 32px;
          min-width: 0;
        }

        /* ── Mobile topbar (hidden on desktop) ── */
        .admin-topbar { display: none; }
        .admin-hamburger { display: none; }

        /* ── Backdrop (mobile only) ── */
        .admin-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 99;
        }

        /* ── Hamburger icon lines ── */
        .admin-hamburger span {
          display: block;
          width: 20px;
          height: 2px;
          background: currentColor;
          border-radius: 1px;
          margin-bottom: 4px;
        }
        .admin-hamburger span:last-child { margin-bottom: 0; }

        /* ── Responsive: tablet + mobile ── */
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh !important;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform 0.24s ease;
          }
          .admin-sidebar.is-open {
            transform: translateX(0);
          }

          .admin-main {
            padding: 16px;
          }

          .admin-topbar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }

          .admin-hamburger {
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: none;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: 8px 10px;
            cursor: pointer;
            color: var(--color-text);
            min-height: 36px;
          }
        }
      `}</style>
    </>
  )
}

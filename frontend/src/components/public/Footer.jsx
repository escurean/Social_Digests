import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--color-terracotta)',
      color: 'white',
      padding: '40px 24px 0',
      marginTop: 'auto',
    }}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '32px',
          paddingBottom: '40px',
        }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Social Digests</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Community discussions and campaigns that matter.
            </p>
          </div>

          {/* Links */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>
              Platform
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Topics', '/topics'],
                ['Campaigns', '/campaigns'],
                ['Community guidelines', '/pages/community-guidelines'],
                ['Privacy policy', '/pages/privacy-policy'],
              ].map(([label, href]) => (
                <Link key={href} to={href} style={{
                  color: 'rgba(255,255,255,0.8)', fontSize: 13,
                  transition: 'color var(--transition-fast)',
                }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>
              Contact
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              support@socialdigests.com
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.15)',
          padding: '16px 0',
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
        }}>
          © 2026 Social Digests. All rights reserved.
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}

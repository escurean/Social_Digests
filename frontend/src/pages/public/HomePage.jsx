import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { content as cmsApi, platformStats } from '../../services/api.js'
import { normalizeList, getPrimaryImageUrl } from '../../utils/strapi.js'
import bgHero from '../../components/public/assets/bg-hero.png'

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!target) return
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return count
}

function StatCounter({ value, label, suffix = '' }) {
  const count = useCountUp(value)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 600, color: 'white', lineHeight: 1 }}>
        {value ? count.toLocaleString() : '—'}{suffix}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

export default function HomePage() {
  const [featuredTopics, setFeaturedTopics] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    cmsApi.topics.featured()
      .then(({ data }) => setFeaturedTopics(normalizeList(data)))
      .catch(() => {})

    platformStats.get()
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [])

  const activeTopics   = stats?.active_topics   ?? 0
  // const totalUsers     = stats?.total_users      ?? 0
  const totalRaisedKes = stats?.total_raised_kes ?? 0

  return (
    <div className="page-enter">
      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(192, 64, 0, 0.72), rgba(192, 64, 0, 0.72)), url(${bgHero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '72px 24px',
        textAlign: 'center',
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <h1 style={{ fontSize: 42, fontWeight: 600, color: 'white', marginBottom: 16, lineHeight: 1.2 }}>
            Where community voices shape the conversation
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 36, lineHeight: 1.7 }}>
            Explore, contribute, and support topics that matter to your community; powered by people like you.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/topics" className="btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>
              Browse topics
            </Link>
            <Link to="/auth/register" className="btn-ghost" style={{ fontSize: 15, padding: '12px 28px' }}>
              Join the community
            </Link>
          </div>
        </div>

        {/* Live stats */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          maxWidth: 520,
          margin: '56px auto 0',
        }}>
          <StatCounter value={activeTopics}   label="Active topics" />
          {/* <StatCounter value={totalUsers}     label="Community members" /> */}
          <StatCounter value={totalRaisedKes} label="KES raised" suffix="+" />
        </div>
      </section>

      {/* ── Featured topics ── */}
      <section className="section" style={{ background: 'rgba(192, 64, 0, 0.1)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Featured topics</h2>
            <Link to="/topics" style={{ color: 'var(--color-terracotta)', fontWeight: 600, fontSize: 13 }}>
              View all →
            </Link>
          </div>

          {featuredTopics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
              No featured topics yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {featuredTopics.map((topic, i) => {
                const imgUrl  = getPrimaryImageUrl(topic)
                const catName = topic.category?.name ?? topic.category_name ?? ''
                return (
                  <Link
                    key={topic.slug}
                    to={`/topics/${topic.slug}`}
                    className={`card card-hover fade-up stagger-${Math.min(i + 1, 5)}`}
                    style={{ display: 'block', borderRadius: 16, overflow: 'hidden' }}
                  >
                    <div style={{
                      height: 120,
                      background: imgUrl
                        ? 'none'
                        : 'linear-gradient(rgba(192,64,0,0.04), rgba(192,64,0,0.32))',
                      backgroundImage: imgUrl ? `url(${imgUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: 12,
                    }}>
                      {catName && (
                        <span className="tag-pill" style={imgUrl ? { background: 'var(--color-sage)' } : {}}>
                          {catName}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 16px' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                        {topic.title}
                      </h3>
                      {topic.context && (
                        <p style={{
                          fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {topic.context.replace(/[#*_`>[\]]/g, '').trim()}
                        </p>
                      )}
                      <span className={`status-badge badge-${topic.status}`}>{topic.status}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Donate CTA ── */}
      <section style={{ background: 'var(--color-sage)', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 600, color: 'white', marginBottom: 12 }}>
            Turn discussions into action
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 28, fontSize: 15 }}>
            Fund campaigns that emerge from the community and track every shilling raised.
          </p>
          <Link to="/campaigns" className="btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>
            See active campaigns
          </Link>
        </div>
      </section>

      <style>{`
        @media (max-width: 600px) {
          section:first-child h1 { font-size: 24px !important; }
          section:first-child > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          .section > .container > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

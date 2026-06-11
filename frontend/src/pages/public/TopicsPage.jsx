import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { content as cmsApi } from '../../services/api.js'
import { normalizeList, getPrimaryImageUrl } from '../../utils/strapi.js'
import useAuthStore from '../../store/authStore.js'

export default function TopicsPage() {
  const [topicList, setTopicList]           = useState([])
  const [categoryList, setCategoryList]     = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading]               = useState(true)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    cmsApi.categories.list()
      .then(({ data }) => setCategoryList(data.categories ?? []))
      .catch(() => {})
  }, [])

  // Load topics from Strapi whenever filter changes
  useEffect(() => {
    setLoading(true)
    const params = {}
    if (activeCategory) params['filters[category][slug][$eq]'] = activeCategory
    // Show active + closed topics publicly; hide drafts
    params['filters[status][$ne]'] = 'draft'

    cmsApi.topics.list(params)
      .then(({ data }) => setTopicList(normalizeList(data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeCategory])

  return (
    <div className="page-enter">
      <div style={{ background: 'var(--color-terracotta)', padding: '40px 24px 32px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: 'white', marginBottom: 6 }}>Topics</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                Community discussions on issues that matter
              </p>
            </div>
            {isAuthenticated && (
              <Link to="/topics/propose" className="btn-primary">Propose a topic</Link>
            )}
          </div>

          {categoryList.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
              <button
                onClick={() => setActiveCategory('')}
                className="tag-pill"
                style={{
                  background: activeCategory === '' ? 'white' : 'rgba(255,255,255,0.15)',
                  color: activeCategory === '' ? 'var(--color-terracotta)' : 'rgba(255,255,255,0.85)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                All
              </button>
              {categoryList.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className="tag-pill"
                  style={{
                    background: activeCategory === cat.slug ? 'white' : 'rgba(255,255,255,0.15)',
                    color: activeCategory === cat.slug ? 'var(--color-terracotta)' : 'rgba(255,255,255,0.85)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading topics…</div>
          ) : topicList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              No topics found.
              {isAuthenticated && (
                <div style={{ marginTop: 12 }}>
                  <Link to="/topics/propose" className="btn-primary">Propose the first one</Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {topicList.map((topic, i) => {
                const imgUrl  = getPrimaryImageUrl(topic)
                const catName = topic.category?.name ?? topic.category_name ?? ''
                const catSlug = topic.category?.slug ?? topic.category_slug ?? ''
                return (
                  <Link
                    key={topic.slug}
                    to={`/topics/${topic.slug}`}
                    className={`card card-hover fade-up stagger-${Math.min(i + 1, 5)}`}
                    style={{
                      display: 'block', borderRadius: 16, overflow: 'hidden',
                      background: '#F7F5F3', border: '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Cover image or gradient placeholder */}
                    <div style={{
                      height: 120,
                      background: imgUrl
                        ? 'none'
                        : 'linear-gradient(rgba(192,64,0,0.04), rgba(192,64,0,0.32))',
                      backgroundImage: imgUrl ? `url(${imgUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: 12,
                    }}>
                      {catName && (
                        <span className="tag-pill" style={imgUrl ? { background: 'var(--color-sage' } : {}}>
                          {catName || catSlug}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 16px' }}>
                     <span className={`status-badge badge-${topic.status}`} style={{ marginLeft: 'auto' }}>
                        {topic.status}
                      </span>
                      <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 8, marginTop: 6}}>
                        {topic.title}
                      </h3>
                      {topic.context && (
                        <p style={{
                          fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {/* Strip markdown for plain preview */}
                          {topic.context.replace(/[#*_`>[\]]/g, '').trim()}
                        </p>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {topic.contribution_count ?? 0} contribution{(topic.contribution_count ?? 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 600px) {
          div[style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

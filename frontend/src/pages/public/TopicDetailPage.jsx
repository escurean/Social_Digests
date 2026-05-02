import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { content as cmsApi, contributions as contributionsApi, campaigns } from '../../services/api.js'
import { normalizeList, getImages, getPrimaryImageUrl } from '../../utils/strapi.js'
import useAuthStore from '../../store/authStore.js'
import useToastStore from '../../store/toastStore.js'

const REACTIONS = [
  { type: 'like',       label: '👍' },
  { type: 'agree',      label: '✅' },
  { type: 'disagree',   label: '❌' },
  { type: 'insightful', label: '💡' },
]

function Avatar({ name, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--color-sage-light)', color: 'var(--color-sage)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.4,
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function TopicDetailPage() {
  const { slug } = useParams()
  const [topic, setTopic]           = useState(null)
  const [contribs, setContribs]     = useState([])
  const [contribTotal, setContribTotal] = useState(0)
  const [linkedCampaign, setLinkedCampaign] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [text, setText]             = useState('')
  const [expanded, setExpanded]     = useState(false)
  const [posting, setPosting]       = useState(false)
  const [reactingTo, setReactingTo] = useState(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user  = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      // Topic content from Strapi (source of truth for title, context, images)
      cmsApi.topics.get(slug),
      // Contributions from Express (social layer)
      contributionsApi.list(slug),
      // Linked campaigns from Strapi
      cmsApi.campaigns.byTopicSlug(slug),
    ]).then(async ([topicRes, contribRes, campRes]) => {
      const topics = normalizeList(topicRes.data)
      if (!topics.length) {
        addToast({ message: 'Topic not found.', type: 'error' })
        return
      }
      const t = topics[0]
      setTopic(t)
      setContribs(contribRes.data.contributions)
      setContribTotal(contribRes.data.total ?? contribRes.data.contributions.length)

      // First linked campaign — fetch financial stats from Express
      const linkedCamps = normalizeList(campRes.data)
      if (linkedCamps.length) {
        const camp = linkedCamps[0]
        try {
          const { data: stats } = await campaigns.stats(camp.slug)
          setLinkedCampaign({ ...camp, ...stats })
        } catch {
          setLinkedCampaign(camp)
        }
      }
    }).catch(() => {
      addToast({ message: 'Failed to load topic.', type: 'error' })
    }).finally(() => setLoading(false))
  }, [slug])

  const handlePost = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      const { data } = await contributionsApi.create(slug, { body: text.trim() })
      setContribs((prev) => [...prev, data])
      setContribTotal((n) => n + 1)
      setText('')
      setExpanded(false)
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to post contribution.', type: 'error' })
    } finally {
      setPosting(false)
    }
  }

  const handleReact = async (contributionId, type) => {
    if (!isAuthenticated) return addToast({ message: 'Sign in to react.', type: 'error' })
    setReactingTo(contributionId)
    try {
      const { data } = await contributionsApi.react(contributionId, type)
      setContribs((prev) => prev.map((c) => {
        if (c.id !== contributionId) return c
        const wasMyReaction = c.my_reaction === type
        return {
          ...c,
          reaction_count: wasMyReaction
            ? Math.max(0, c.reaction_count - 1)
            : (data.reacted ? c.reaction_count + (c.my_reaction ? 0 : 1) : c.reaction_count),
          my_reaction: data.reacted ? type : null,
        }
      }))
    } catch {
      addToast({ message: 'Failed to react.', type: 'error' })
    } finally {
      setReactingTo(null)
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this contribution?')) return
    try {
      await contributionsApi.remove(id)
      setContribs((prev) => prev.filter((c) => c.id !== id))
      setContribTotal((n) => Math.max(0, n - 1))
    } catch {
      addToast({ message: 'Failed to remove.', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="page-enter">
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="page-enter">
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Topic not found. <Link to="/topics">Browse all topics</Link>
        </div>
      </div>
    )
  }

  const images   = getImages(topic)
  const heroImg  = getPrimaryImageUrl(topic, 'large')
  const catName  = topic.category?.name ?? topic.category_name ?? ''
  const contextText = typeof topic.context === 'string'
    ? topic.context
    : topic.context?.replace?.(/[#*_`>[\]]/g, '').trim() ?? ''

  return (
    <div className="page-enter">
      {/* Hero */}
      {heroImg ? (
        <div style={{
          height: 280, backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      ) : (
        <div style={{ background: 'var(--color-terracotta)', padding: '40px 24px' }}>
          <div className="container">
            <Link to="/topics" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              ← Back to topics
            </Link>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {catName && (
                <span className="tag-pill" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                  {catName}
                </span>
              )}
              <span className={`status-badge badge-${topic.status}`}>{topic.status}</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: 'white', lineHeight: 1.3 }}>
              {topic.title}
            </h1>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 10 }}>
              {contribTotal} contribution{contribTotal !== 1 ? 's' : ''} ·
              Opened {new Date(topic.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {heroImg && (
        <div style={{ background: 'var(--color-terracotta)', padding: '20px 24px' }}>
          <div className="container">
            <Link to="/topics" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              ← Back to topics
            </Link>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              {catName && (
                <span className="tag-pill" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>{catName}</span>
              )}
              <span className={`status-badge badge-${topic.status}`}>{topic.status}</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: 'white', lineHeight: 1.3 }}>
              {topic.title}
            </h1>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8 }}>
              {contribTotal} contribution{contribTotal !== 1 ? 's' : ''} ·
              Opened {new Date(topic.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
          <div>
            {/* Additional images gallery */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
                {images.slice(1).map((img) => (
                  <img
                    key={img.id}
                    src={img.formats?.small?.url ?? img.url}
                    alt=""
                    style={{ height: 80, width: 120, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                ))}
              </div>
            )}

            {contextText && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Topic background</h2>
                <p style={{ lineHeight: 1.7, color: 'var(--color-text)', fontSize: 14 }}>{contextText}</p>
              </div>
            )}

            {topic.status === 'active' ? (
              isAuthenticated ? (
                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                  <textarea
                    className="form-input"
                    placeholder="Add your contribution…"
                    value={text}
                    onFocus={() => setExpanded(true)}
                    onChange={(e) => setText(e.target.value)}
                    style={{ minHeight: expanded ? 120 : 60, resize: 'vertical', transition: 'min-height 250ms ease' }}
                  />
                  {expanded && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '7px 16px', minHeight: 34 }}
                        onClick={() => { setExpanded(false); setText('') }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        style={{ padding: '7px 16px', minHeight: 34 }}
                        disabled={posting || !text.trim()}
                        onClick={handlePost}
                      >
                        {posting ? 'Posting…' : 'Post contribution'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ padding: 20, marginBottom: 24, textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Sign in to add your voice to this discussion
                  </p>
                  <Link to="/auth/login" className="btn-primary">Sign in</Link>
                </div>
              )
            ) : (
              <div className="card" style={{ padding: 16, marginBottom: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                This topic is closed to new contributions.
              </div>
            )}

            {contribs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
                No contributions yet. Be the first to share your perspective.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {contribs.map((c, i) => (
                  <div key={c.id} className={`card fade-up stagger-${Math.min(i + 1, 5)}`} style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.user_name} />
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user_name}</span>
                          {c.user_role === 'admin' && (
                            <span className="status-badge badge-active" style={{ marginLeft: 6, fontSize: 10 }}>Admin</span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{c.body}</p>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {REACTIONS.map((r) => (
                        <button
                          key={r.type}
                          disabled={reactingTo === c.id || !isAuthenticated}
                          onClick={() => handleReact(c.id, r.type)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: 12, padding: '3px 10px',
                            border: `1px solid ${c.my_reaction === r.type ? 'var(--color-sage)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-pill)',
                            background: c.my_reaction === r.type ? 'var(--color-sage-light)' : 'none',
                            cursor: isAuthenticated ? 'pointer' : 'default', color: 'var(--color-text)',
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                        {c.reaction_count} reaction{c.reaction_count !== 1 ? 's' : ''}
                      </span>
                      {(user?.id === c.user_id || user?.role === 'admin') && (
                        <button
                          onClick={() => handleRemove(c.id)}
                          style={{
                            marginLeft: 'auto', fontSize: 11, padding: '3px 8px',
                            background: 'none', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside style={{ position: 'sticky', top: 88 }}>
            {linkedCampaign && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Linked campaign</h3>
                {getPrimaryImageUrl(linkedCampaign) && (
                  <img
                    src={getPrimaryImageUrl(linkedCampaign)}
                    alt={linkedCampaign.title}
                    style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                  />
                )}
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{linkedCampaign.title}</p>
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div
                    className="progress-bar-inner"
                    style={{
                      width: `${Math.min(linkedCampaign.goal_amount > 0
                        ? (linkedCampaign.raised_amount / linkedCampaign.goal_amount) * 100
                        : 0, 100)}%`
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                  {linkedCampaign.currency} {Number(linkedCampaign.raised_amount ?? 0).toLocaleString()} of {Number(linkedCampaign.goal_amount).toLocaleString()} raised
                </div>
                <Link
                  to={`/campaigns/${linkedCampaign.slug}`}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                >
                  Donate
                </Link>
              </div>
            )}

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {contribTotal} contributor{contribTotal !== 1 ? 's' : ''}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contribs.slice(0, 12).map((c) => (
                  <Avatar key={c.id} name={c.user_name} size={28} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          div[style*="grid-template-columns: 1fr 320px"] { grid-template-columns: 1fr !important; }
          aside { position: static !important; }
        }
      `}</style>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { content as cmsApi, campaigns as campaignsApi } from '../../services/api.js'
import { normalizeList, getPrimaryImageUrl } from '../../utils/strapi.js'

function CampaignCard({ campaign, index }) {
  const pct          = Math.min(Number(campaign.progress_pct) || 0, 100)
  const isGoalReached = Number(campaign.raised_amount) >= Number(campaign.goal_amount)
  const imgUrl       = getPrimaryImageUrl(campaign)

  return (
    <Link
      to={`/campaigns/${campaign.slug}`}
      className={`card card-hover fade-up stagger-${Math.min(index + 1, 5)}`}
      style={{ display: 'block', overflow: 'hidden' }}
    >
      {/* Cover image */}
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={campaign.title}
          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          height: 160, background: 'var(--color-sage-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-sage)', fontSize: 13,
        }}>
          Campaign photo
        </div>
      )}

      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className={`status-badge ${isGoalReached ? 'badge-active' : 'badge-pending'}`}>
            {isGoalReached ? 'Goal reached' : campaign.status}
          </span>
          {campaign.deadline && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Ends {new Date(campaign.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, lineHeight: 1.4 }}>
          {campaign.title}
        </h3>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-bar-inner" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span>{campaign.currency} {Number(campaign.raised_amount ?? 0).toLocaleString()} raised</span>
          <span>{pct}%</span>
        </div>
      </div>
    </Link>
  )
}

export default function CampaignsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch active campaign content from Strapi, then augment with donation stats from Express
    cmsApi.campaigns.active()
      .then(async ({ data }) => {
        const campaigns = normalizeList(data)

        // Batch-fetch donation stats from Express for each campaign
        const statsResults = await Promise.allSettled(
          campaigns.map((c) => campaignsApi.stats(c.slug))
        )
        statsResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            campaigns[i].raised_amount = result.value.data.raised_amount
            campaigns[i].progress_pct  = result.value.data.progress_pct
            campaigns[i].donor_count   = result.value.data.donor_count
          }
        })

        setList(campaigns)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-enter">
      <div style={{ background: 'var(--color-terracotta)', padding: '40px 24px' }}>
        <div className="container">
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'white', marginBottom: 6 }}>Campaigns</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Fund the change your community needs</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading campaigns…</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              No active campaigns at the moment.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              {list.map((c, i) => (
                <CampaignCard key={c.slug} campaign={c} index={i} />
              ))}
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

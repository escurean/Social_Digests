import crypto from 'crypto'
import { query } from '../config/db.js'
import { logger } from '../services/logger.js'

// Strapi sends Authorization: Bearer <STRAPI_WEBHOOK_SECRET>
function verifyAuth(authHeader) {
  const secret = process.env.STRAPI_WEBHOOK_SECRET
  if (!secret) return true  // skip verification if no secret configured
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}

// ── Model UID → handler mapping ───────────────────────────────
// Strapi v4 sends uid like "api::topics.topic" or "api::topic-categories.topic-categories"
// We match on the part before the dot to be version-tolerant.

function resolveHandler(uid = '', model = '') {
  const key = uid.split('.')[0].replace('api::', '')
  if (key === 'topic-categories' || model === 'topic-category') return 'category'
  if (key === 'topics'           || model === 'topic')           return 'topic'
  if (key === 'donation-campaigns' || model === 'donation-campaign') return 'campaign'
  return null
}

// ── Main handler ──────────────────────────────────────────────

export async function strapiWebhook(req, res, next) {
  try {
    if (!verifyAuth(req.headers['authorization'])) {
      logger.warn({ event: 'webhook.bad_auth' }, 'Strapi webhook auth failed')
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    // Body is a Buffer when mounted with express.raw(); parse it here.
    let payload
    try {
      payload = JSON.parse(req.body.toString())
    } catch {
      return res.status(400).json({ error: 'Invalid JSON.' })
    }

    const { event, uid, model, entry } = payload
    if (!event || !entry) return res.status(400).json({ error: 'Missing event or entry.' })

    const handler = resolveHandler(uid, model)
    logger.info({ event: 'webhook.strapi', strapiEvent: event, model, uid, handler }, 'Strapi webhook received')

    if (handler === 'category')  await syncCategory(event, entry)
    else if (handler === 'topic')    await syncTopic(event, entry)
    else if (handler === 'campaign') await syncCampaign(event, entry)
    // unknown models are silently accepted (200) so Strapi doesn't retry

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
}

// ── Sync helpers ──────────────────────────────────────────────

async function syncCategory(event, entry) {
  if (event === 'entry.delete') {
    if (entry.slug) {
      await query('DELETE FROM categories WHERE slug = $1', [entry.slug])
      logger.info({ event: 'webhook.category_deleted', slug: entry.slug })
    }
    return
  }

  const { slug, name, description } = entry
  if (!slug || !name) return

  await query(
    `INSERT INTO categories (slug, name, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description`,
    [slug, name, description ?? null]
  )
  logger.info({ event: 'webhook.category_synced', slug })
}

async function syncTopic(event, entry) {
  if (event === 'entry.delete') {
    if (entry.slug) {
      await query('DELETE FROM topics WHERE slug = $1', [entry.slug])
      logger.info({ event: 'webhook.topic_deleted', slug: entry.slug })
    }
    return
  }

  const { slug, title, context, status, is_featured } = entry
  if (!slug || !title) return

  // Category relation arrives as object with slug, or as { id } only, or null
  const categorySlug = entry.category?.slug ?? null
  const resolvedStatus = status ?? (entry.publishedAt ? 'active' : 'draft')

  await query(
    `INSERT INTO topics (slug, title, context, category_slug, status, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (slug) DO UPDATE
       SET title         = EXCLUDED.title,
           context       = EXCLUDED.context,
           category_slug = EXCLUDED.category_slug,
           status        = EXCLUDED.status,
           is_featured   = EXCLUDED.is_featured,
           updated_at    = NOW()`,
    [slug, title, context ?? null, categorySlug, resolvedStatus, is_featured ?? false]
  )
  logger.info({ event: 'webhook.topic_synced', slug })
}

async function syncCampaign(event, entry) {
  if (event === 'entry.delete') {
    if (entry.slug) {
      await query('DELETE FROM campaigns WHERE slug = $1', [entry.slug])
      logger.info({ event: 'webhook.campaign_deleted', slug: entry.slug })
    }
    return
  }

  const { slug, title, description, goal_amount, currency, deadline,
          beneficiary_name, status, topic_slug } = entry
  if (!slug || !title) return

  const resolvedStatus = status ?? (entry.publishedAt ? 'active' : 'draft')

  await query(
    `INSERT INTO campaigns
       (slug, title, description, goal_amount, currency, deadline, beneficiary_name, status, topic_slug)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (slug) DO UPDATE
       SET title            = EXCLUDED.title,
           description      = EXCLUDED.description,
           goal_amount      = EXCLUDED.goal_amount,
           currency         = EXCLUDED.currency,
           deadline         = EXCLUDED.deadline,
           beneficiary_name = EXCLUDED.beneficiary_name,
           status           = EXCLUDED.status,
           topic_slug       = EXCLUDED.topic_slug,
           updated_at       = NOW()`,
    [
      slug, title, description ?? null,
      goal_amount ? parseFloat(goal_amount) : 0,
      currency ?? 'KES', deadline ?? null,
      beneficiary_name ?? null, resolvedStatus, topic_slug ?? null,
    ]
  )
  logger.info({ event: 'webhook.campaign_synced', slug })
}

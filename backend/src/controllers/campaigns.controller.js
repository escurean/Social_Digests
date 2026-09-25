import { query } from '../config/db.js'
import { getCache, setCache, invalidate } from '../services/cache.js'
import { sanitizeImages } from '../utils/media.js'

const STATUSES = ['draft', 'active', 'closed', 'goal_reached', 'expired', 'completed']

const CAMPAIGN_TTL = 30 // seconds

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function listImpl(req, res, next, includeDrafts) {
  try {
    const { status, topic_slug, page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit))

    const conditions = includeDrafts ? [] : ["c.status <> 'draft'"]
    const params = []

    if (status) { params.push(status); conditions.push(`c.status = $${params.length}`) }
    if (topic_slug) { params.push(topic_slug); conditions.push(`c.topic_slug = $${params.length}`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const lim = Math.min(50, parseInt(limit))

    const { rows } = await query(
      `SELECT c.*,
              CASE WHEN c.goal_amount > 0 THEN ROUND((c.raised_amount::numeric / c.goal_amount) * 100, 1) ELSE 0 END AS progress_pct,
              t.title AS topic_title,
              u.name  AS created_by_name
       FROM campaigns c
       LEFT JOIN topics t ON t.slug = c.topic_slug
       LEFT JOIN users u ON u.id = c.created_by
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ${lim} OFFSET ${offset}`,
      params
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM campaigns c ${where}`, params
    )

    res.json({ campaigns: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

async function getOneImpl(req, res, next, includeDrafts) {
  try {
    const { slug } = req.params
    const cacheKey = `campaign:${slug}`
    const cached = includeDrafts ? null : await getCache(cacheKey)
    if (cached) return res.json(cached)

    const { rows: [campaign] } = await query(
      `SELECT c.*,
              CASE WHEN c.goal_amount > 0 THEN ROUND((c.raised_amount::numeric / c.goal_amount) * 100, 1) ELSE 0 END AS progress_pct,
              t.title AS topic_title,
              u.name  AS created_by_name
       FROM campaigns c
       LEFT JOIN topics t ON t.slug = c.topic_slug
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.slug = $1 ${includeDrafts ? '' : "AND c.status <> 'draft'"}`,
      [slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })
    if (!includeDrafts) await setCache(cacheKey, campaign, CAMPAIGN_TTL)
    res.json(campaign)
  } catch (err) {
    next(err)
  }
}

export const list        = (req, res, next) => listImpl(req, res, next, false)
export const getOne      = (req, res, next) => getOneImpl(req, res, next, false)
// Admin reads include drafts (mounted under /api/admin, admin-only).
export const adminList   = (req, res, next) => listImpl(req, res, next, true)
export const adminGetOne = (req, res, next) => getOneImpl(req, res, next, true)

function fkError(err, res) {
  if (err.code === '23503') { res.status(400).json({ error: 'Unknown linked topic.' }); return true }
  return false
}

export async function create(req, res, next) {
  try {
    const { title, description, goal_amount, currency = 'KES', deadline, beneficiary_name, beneficiary_details,
            status = 'active', topic_slug, images } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!goal_amount || isNaN(goal_amount) || Number(goal_amount) <= 0) return res.status(400).json({ error: 'goal_amount is required.' })
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' })

    let slug = slugify(title)
    const { rows: existing } = await query('SELECT id FROM campaigns WHERE slug = $1', [slug])
    if (existing.length) slug = `${slug}-${Date.now()}`

    const { rows: [campaign] } = await query(
      `INSERT INTO campaigns (slug, title, description, goal_amount, currency, deadline, beneficiary_name,
                              beneficiary_details, status, topic_slug, images, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [slug, title.trim(), description?.trim() || null, parseFloat(goal_amount), currency,
       deadline || null, beneficiary_name?.trim() || null, beneficiary_details?.trim() || null,
       status, topic_slug || null, JSON.stringify(sanitizeImages(images)), req.user.id]
    )

    await invalidate(`campaign:${slug}*`)
    res.status(201).json(campaign)
  } catch (err) {
    if (fkError(err, res)) return
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { slug } = req.params
    const b = req.body

    if (b.title !== undefined && !b.title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (b.status !== undefined && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' })
    if (b.goal_amount !== undefined && (isNaN(b.goal_amount) || Number(b.goal_amount) <= 0)) {
      return res.status(400).json({ error: 'goal_amount must be a positive number.' })
    }

    // Only fields present in the body are changed, so a field can be cleared with '' / null.
    const fields = {}
    if (b.title               !== undefined) fields.title               = b.title.trim()
    if (b.description         !== undefined) fields.description         = b.description?.trim() || null
    if (b.goal_amount         !== undefined) fields.goal_amount         = parseFloat(b.goal_amount)
    if (b.currency            !== undefined) fields.currency            = b.currency
    if (b.deadline            !== undefined) fields.deadline            = b.deadline || null
    if (b.beneficiary_name    !== undefined) fields.beneficiary_name    = b.beneficiary_name?.trim() || null
    if (b.beneficiary_details !== undefined) fields.beneficiary_details = b.beneficiary_details?.trim() || null
    if (b.status              !== undefined) fields.status              = b.status
    if (b.topic_slug          !== undefined) fields.topic_slug          = b.topic_slug || null
    if (b.images              !== undefined) fields.images              = JSON.stringify(sanitizeImages(b.images))

    const keys = Object.keys(fields)
    const sets = keys.map((k, i) => `${k} = $${i + 1}`)
    const { rows: [campaign] } = await query(
      `UPDATE campaigns SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE slug = $${keys.length + 1} RETURNING *`,
      [...keys.map((k) => fields[k]), slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })

    await invalidate(`campaign:${slug}*`)
    res.json(campaign)
  } catch (err) {
    if (fkError(err, res)) return
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [c] } = await query('SELECT id FROM campaigns WHERE slug = $1', [slug])
    if (!c) return res.status(404).json({ error: 'Campaign not found.' })
    await query('DELETE FROM campaigns WHERE slug = $1', [slug])
    await invalidate(`campaign:${slug}*`)
    res.json({ message: 'Campaign deleted.' })
  } catch (err) {
    next(err)
  }
}

export async function getStats(req, res, next) {
  try {
    const { slug } = req.params
    const cacheKey = `campaign:${slug}:stats`
    const cached = await getCache(cacheKey)
    if (cached) return res.json(cached)

    const { rows: [campaign] } = await query(
      `SELECT c.id, c.slug, c.title, c.goal_amount, c.raised_amount, c.currency, c.deadline, c.status,
              CASE WHEN c.goal_amount > 0 THEN ROUND((c.raised_amount::numeric / c.goal_amount) * 100, 1) ELSE 0 END AS progress_pct,
              COUNT(d.id)::int AS donor_count
       FROM campaigns c
       LEFT JOIN donations d ON d.campaign_id = c.id AND d.status = 'completed'
       WHERE c.slug = $1
       GROUP BY c.id`,
      [slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })
    await setCache(cacheKey, campaign, CAMPAIGN_TTL)
    res.json(campaign)
  } catch (err) {
    next(err)
  }
}

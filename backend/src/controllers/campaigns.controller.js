import { query } from '../config/db.js'
import { getCache, setCache, invalidate } from '../services/cache.js'

const CAMPAIGN_TTL = 30 // seconds

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function list(req, res, next) {
  try {
    const { status, topic_slug, page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit))

    const conditions = []
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

export async function getOne(req, res, next) {
  try {
    const { slug } = req.params
    const cacheKey = `campaign:${slug}`
    const cached = await getCache(cacheKey)
    if (cached) return res.json(cached)

    const { rows: [campaign] } = await query(
      `SELECT c.*,
              CASE WHEN c.goal_amount > 0 THEN ROUND((c.raised_amount::numeric / c.goal_amount) * 100, 1) ELSE 0 END AS progress_pct,
              t.title AS topic_title,
              u.name  AS created_by_name
       FROM campaigns c
       LEFT JOIN topics t ON t.slug = c.topic_slug
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.slug = $1`,
      [slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })
    await setCache(cacheKey, campaign, CAMPAIGN_TTL)
    res.json(campaign)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const { title, description, goal_amount, currency = 'KES', deadline, beneficiary_name, status = 'active', topic_slug } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!goal_amount || isNaN(goal_amount)) return res.status(400).json({ error: 'goal_amount is required.' })

    let slug = slugify(title)
    const { rows: existing } = await query('SELECT id FROM campaigns WHERE slug = $1', [slug])
    if (existing.length) slug = `${slug}-${Date.now()}`

    const { rows: [campaign] } = await query(
      `INSERT INTO campaigns (slug, title, description, goal_amount, currency, deadline, beneficiary_name, status, topic_slug, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [slug, title.trim(), description?.trim() || null, parseInt(goal_amount), currency,
       deadline || null, beneficiary_name?.trim() || null, status, topic_slug || null, req.user.id]
    )

    await invalidate(`campaign:${slug}*`)
    res.status(201).json(campaign)
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { slug } = req.params
    const { title, description, goal_amount, currency, deadline, beneficiary_name, status, topic_slug } = req.body

    const { rows: [existing] } = await query('SELECT id FROM campaigns WHERE slug = $1', [slug])
    if (!existing) return res.status(404).json({ error: 'Campaign not found.' })

    const { rows: [campaign] } = await query(
      `UPDATE campaigns SET
         title            = COALESCE($1, title),
         description      = COALESCE($2, description),
         goal_amount      = COALESCE($3, goal_amount),
         currency         = COALESCE($4, currency),
         deadline         = COALESCE($5, deadline),
         beneficiary_name = COALESCE($6, beneficiary_name),
         status           = COALESCE($7, status),
         topic_slug       = COALESCE($8, topic_slug),
         updated_at       = NOW()
       WHERE slug = $9 RETURNING *`,
      [title?.trim() || null, description?.trim() || null,
       goal_amount ? parseInt(goal_amount) : null,
       currency || null, deadline || null, beneficiary_name?.trim() || null,
       status || null, topic_slug || null, slug]
    )

    await invalidate(`campaign:${slug}*`)
    res.json(campaign)
  } catch (err) {
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

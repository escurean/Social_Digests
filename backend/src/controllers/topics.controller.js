import { query } from '../config/db.js'
import { sanitizeImages } from '../utils/media.js'

const STATUSES = ['draft', 'active', 'closed', 'archived']

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function listImpl(req, res, next, includeDrafts) {
  try {
    const { status, category, featured, page = 1, limit = 50 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))

    const conditions = includeDrafts ? [] : ["t.status <> 'draft'"]
    const params = []

    if (status) { params.push(status); conditions.push(`t.status = $${params.length}`) }
    if (category) { params.push(category); conditions.push(`t.category_slug = $${params.length}`) }
    if (featured === 'true') conditions.push('t.is_featured = true')

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT t.*, c.name AS category_name,
              u.name AS created_by_name
       FROM topics t
       LEFT JOIN categories c ON c.slug = t.category_slug
       LEFT JOIN users u ON u.id = t.created_by
       ${where}
       ORDER BY t.is_featured DESC, t.created_at DESC
       LIMIT ${Math.min(100, parseInt(limit))} OFFSET ${offset}`,
      params
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM topics t ${where}`, params
    )

    res.json({ topics: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

async function getOneImpl(req, res, next, includeDrafts) {
  try {
    const { slug } = req.params
    const { rows: [topic] } = await query(
      `SELECT t.*, c.name AS category_name, u.name AS created_by_name
       FROM topics t
       LEFT JOIN categories c ON c.slug = t.category_slug
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.slug = $1 ${includeDrafts ? '' : "AND t.status <> 'draft'"}`,
      [slug]
    )
    if (!topic) return res.status(404).json({ error: 'Topic not found.' })

    const { rows: campaigns } = await query(
      `SELECT id, slug, title, goal_amount, raised_amount, currency, deadline, status
       FROM campaigns WHERE topic_slug = $1 ${includeDrafts ? '' : "AND status <> 'draft'"}`,
      [slug]
    )

    res.json({ ...topic, campaigns })
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
  if (err.code === '23503') { res.status(400).json({ error: 'Unknown category.' }); return true }
  return false
}

export async function create(req, res, next) {
  try {
    const { title, context, category_slug, status = 'active', is_featured = false, images } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' })

    let slug = slugify(title)
    const { rows: existing } = await query('SELECT id FROM topics WHERE slug = $1', [slug])
    if (existing.length) slug = `${slug}-${Date.now()}`

    const { rows: [topic] } = await query(
      `INSERT INTO topics (slug, title, context, category_slug, status, is_featured, images, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [slug, title.trim(), context?.trim() || null, category_slug || null, status, !!is_featured,
       JSON.stringify(sanitizeImages(images)), req.user.id]
    )

    res.status(201).json(topic)
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

    // Only fields present in the body are changed, so a field can be cleared with '' / null.
    const fields = {}
    if (b.title         !== undefined) fields.title         = b.title.trim()
    if (b.context       !== undefined) fields.context       = b.context?.trim() || null
    if (b.category_slug !== undefined) fields.category_slug = b.category_slug || null
    if (b.status        !== undefined) fields.status        = b.status
    if (b.is_featured   !== undefined) fields.is_featured   = !!b.is_featured
    if (b.images        !== undefined) fields.images        = JSON.stringify(sanitizeImages(b.images))

    const keys = Object.keys(fields)
    const sets = keys.map((k, i) => `${k} = $${i + 1}`)
    const { rows: [topic] } = await query(
      `UPDATE topics SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE slug = $${keys.length + 1} RETURNING *`,
      [...keys.map((k) => fields[k]), slug]
    )
    if (!topic) return res.status(404).json({ error: 'Topic not found.' })

    res.json(topic)
  } catch (err) {
    if (fkError(err, res)) return
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [topic] } = await query('SELECT id FROM topics WHERE slug = $1', [slug])
    if (!topic) return res.status(404).json({ error: 'Topic not found.' })

    await query('DELETE FROM topics WHERE slug = $1', [slug])
    res.json({ message: 'Topic deleted.' })
  } catch (err) {
    next(err)
  }
}

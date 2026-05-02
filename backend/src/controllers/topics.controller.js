import { query } from '../config/db.js'

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function list(req, res, next) {
  try {
    const { status, category, featured, page = 1, limit = 50 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))

    const conditions = []
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

export async function getOne(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [topic] } = await query(
      `SELECT t.*, c.name AS category_name, u.name AS created_by_name
       FROM topics t
       LEFT JOIN categories c ON c.slug = t.category_slug
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.slug = $1`,
      [slug]
    )
    if (!topic) return res.status(404).json({ error: 'Topic not found.' })

    const { rows: campaigns } = await query(
      `SELECT id, slug, title, goal_amount, raised_amount, currency, deadline, status
       FROM campaigns WHERE topic_slug = $1 AND status != 'draft'`,
      [slug]
    )

    res.json({ ...topic, campaigns })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const { title, context, category_slug, status = 'active', is_featured = false } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })

    let slug = slugify(title)
    const { rows: existing } = await query('SELECT id FROM topics WHERE slug = $1', [slug])
    if (existing.length) slug = `${slug}-${Date.now()}`

    const { rows: [topic] } = await query(
      `INSERT INTO topics (slug, title, context, category_slug, status, is_featured, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [slug, title.trim(), context?.trim() || null, category_slug || null, status, is_featured, req.user.id]
    )

    res.status(201).json(topic)
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { slug } = req.params
    const { title, context, category_slug, status, is_featured } = req.body

    const { rows: [existing] } = await query('SELECT * FROM topics WHERE slug = $1', [slug])
    if (!existing) return res.status(404).json({ error: 'Topic not found.' })

    const { rows: [topic] } = await query(
      `UPDATE topics SET
        title         = COALESCE($1, title),
        context       = COALESCE($2, context),
        category_slug = COALESCE($3, category_slug),
        status        = COALESCE($4, status),
        is_featured   = COALESCE($5, is_featured),
        updated_at    = NOW()
       WHERE slug = $6
       RETURNING *`,
      [title?.trim() || null, context?.trim() || null, category_slug || null, status || null,
       is_featured !== undefined ? is_featured : null, slug]
    )

    res.json(topic)
  } catch (err) {
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

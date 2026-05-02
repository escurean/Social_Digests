import { query } from '../config/db.js'

export async function list(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT p.id, p.slug, p.title, p.show_in_footer, p.created_at, p.updated_at,
              u.name AS updated_by_name
       FROM static_pages p
       LEFT JOIN users u ON u.id = p.updated_by
       ORDER BY p.title`
    )
    res.json({ pages: rows })
  } catch (err) { next(err) }
}

export async function getOne(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [page] } = await query(
      'SELECT * FROM static_pages WHERE slug = $1', [slug]
    )
    if (!page) return res.status(404).json({ error: 'Page not found.' })
    res.json(page)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const { slug, title, content = '', show_in_footer = false } = req.body
    if (!slug?.trim()) return res.status(400).json({ error: 'slug is required.' })
    if (!title?.trim()) return res.status(400).json({ error: 'title is required.' })

    const { rows: [page] } = await query(
      `INSERT INTO static_pages (slug, title, content, show_in_footer, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [slug.trim(), title.trim(), content, show_in_footer, req.user.id]
    )
    res.status(201).json(page)
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A page with that slug already exists.' })
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { slug } = req.params
    const { title, content, show_in_footer } = req.body

    const { rows: [page] } = await query(
      `UPDATE static_pages SET
         title          = COALESCE($1, title),
         content        = COALESCE($2, content),
         show_in_footer = COALESCE($3, show_in_footer),
         updated_by     = $4,
         updated_at     = NOW()
       WHERE slug = $5 RETURNING *`,
      [title?.trim() || null, content ?? null,
       show_in_footer !== undefined ? show_in_footer : null,
       req.user.id, slug]
    )
    if (!page) return res.status(404).json({ error: 'Page not found.' })
    res.json(page)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [p] } = await query('SELECT id FROM static_pages WHERE slug = $1', [slug])
    if (!p) return res.status(404).json({ error: 'Page not found.' })
    await query('DELETE FROM static_pages WHERE slug = $1', [slug])
    res.json({ message: 'Page deleted.' })
  } catch (err) { next(err) }
}

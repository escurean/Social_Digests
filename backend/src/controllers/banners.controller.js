import { query } from '../config/db.js'

export async function list(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT b.*, u.name AS created_by_name
       FROM banners b
       LEFT JOIN users u ON u.id = b.created_by
       ORDER BY b.created_at DESC`
    )
    res.json({ banners: rows })
  } catch (err) { next(err) }
}

export async function listActive(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { rows } = await query(
      `SELECT id, title, body, starts_at, ends_at FROM banners
       WHERE is_active = true
         AND (starts_at IS NULL OR starts_at <= $1)
         AND (ends_at   IS NULL OR ends_at   >= $1)
       ORDER BY created_at DESC`,
      [today]
    )
    res.json({ banners: rows })
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const { title, body, is_active = false, starts_at, ends_at } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })

    const { rows: [banner] } = await query(
      `INSERT INTO banners (title, body, is_active, starts_at, ends_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title.trim(), body?.trim() || null, is_active,
       starts_at || null, ends_at || null, req.user.id]
    )
    res.status(201).json(banner)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params
    const { title, body, is_active, starts_at, ends_at } = req.body

    const { rows: [banner] } = await query(
      `UPDATE banners SET
         title      = COALESCE($1, title),
         body       = COALESCE($2, body),
         is_active  = COALESCE($3, is_active),
         starts_at  = COALESCE($4, starts_at),
         ends_at    = COALESCE($5, ends_at),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title?.trim() || null, body?.trim() || null,
       is_active !== undefined ? is_active : null,
       starts_at !== undefined ? (starts_at || null) : undefined,
       ends_at   !== undefined ? (ends_at   || null) : undefined,
       id]
    )
    if (!banner) return res.status(404).json({ error: 'Banner not found.' })
    res.json(banner)
  } catch (err) { next(err) }
}

export async function toggle(req, res, next) {
  try {
    const { id } = req.params
    const { rows: [banner] } = await query(
      `UPDATE banners SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    )
    if (!banner) return res.status(404).json({ error: 'Banner not found.' })
    res.json(banner)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params
    const { rows: [b] } = await query('SELECT id FROM banners WHERE id = $1', [id])
    if (!b) return res.status(404).json({ error: 'Banner not found.' })
    await query('DELETE FROM banners WHERE id = $1', [id])
    res.json({ message: 'Banner deleted.' })
  } catch (err) { next(err) }
}

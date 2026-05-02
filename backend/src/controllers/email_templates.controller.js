import { query } from '../config/db.js'

export async function list(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT t.*, u.name AS updated_by_name
       FROM email_templates t
       LEFT JOIN users u ON u.id = t.updated_by
       ORDER BY t.key`
    )
    res.json({ templates: rows })
  } catch (err) { next(err) }
}

export async function getOne(req, res, next) {
  try {
    const { key } = req.params
    const { rows: [tpl] } = await query(
      'SELECT * FROM email_templates WHERE key = $1', [key]
    )
    if (!tpl) return res.status(404).json({ error: 'Template not found.' })
    res.json(tpl)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const { key } = req.params
    const { subject, body_html, description, is_active } = req.body

    const { rows: [tpl] } = await query(
      `UPDATE email_templates SET
         subject     = COALESCE($1, subject),
         body_html   = COALESCE($2, body_html),
         description = COALESCE($3, description),
         is_active   = COALESCE($4, is_active),
         updated_by  = $5,
         updated_at  = NOW()
       WHERE key = $6 RETURNING *`,
      [subject?.trim() || null, body_html ?? null, description?.trim() || null,
       is_active !== undefined ? is_active : null,
       req.user.id, key]
    )
    if (!tpl) return res.status(404).json({ error: 'Template not found.' })
    res.json(tpl)
  } catch (err) { next(err) }
}

export async function toggle(req, res, next) {
  try {
    const { key } = req.params
    const { rows: [tpl] } = await query(
      `UPDATE email_templates SET is_active = NOT is_active, updated_at = NOW(), updated_by = $1
       WHERE key = $2 RETURNING *`,
      [req.user.id, key]
    )
    if (!tpl) return res.status(404).json({ error: 'Template not found.' })
    res.json(tpl)
  } catch (err) { next(err) }
}

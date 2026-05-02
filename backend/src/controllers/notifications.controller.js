import { query } from '../config/db.js'

export async function list(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { rows } = await query(
      `SELECT id, type, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    )

    const { rows: [{ count: total }] } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1', [req.user.id]
    )
    const { rows: [{ count: unread }] } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]
    )

    res.json({ notifications: rows, total: parseInt(total), unread: parseInt(unread), page, limit })
  } catch (err) {
    next(err)
  }
}

export async function markRead(req, res, next) {
  try {
    const { id } = req.params
    const { rows: [n] } = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    )
    if (!n) return res.status(404).json({ error: 'Notification not found.' })
    res.json({ message: 'Marked as read.' })
  } catch (err) {
    next(err)
  }
}

export async function markAllRead(req, res, next) {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id])
    res.json({ message: 'All notifications marked as read.' })
  } catch (err) {
    next(err)
  }
}

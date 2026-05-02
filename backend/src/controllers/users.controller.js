import { query } from '../config/db.js'

export async function getProfile(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id.' })

    const { rows: [user] } = await query(
      `SELECT id, name, email, role, avatar_url, bio, is_banned, created_at FROM users WHERE id = $1`,
      [id]
    )
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const { rows: [{ count: contribution_count }] } = await query(
      'SELECT COUNT(*) FROM contributions WHERE user_id = $1 AND is_removed = false', [id]
    )

    if (req.user?.id !== id && req.user?.role !== 'admin') {
      delete user.email
    }

    res.json({ ...user, contribution_count: parseInt(contribution_count) })
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' })
    }

    const { name, bio, avatar_url } = req.body

    const { rows: [user] } = await query(
      `UPDATE users SET
         name       = COALESCE($1, name),
         bio        = COALESCE($2, bio),
         avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, name, email, role, avatar_url, bio, created_at`,
      [name?.trim() || null, bio?.trim() || null, avatar_url?.trim() || null, id]
    )
    if (!user) return res.status(404).json({ error: 'User not found.' })

    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function getContributions(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { rows } = await query(
      `SELECT c.id, c.body, c.topic_slug, c.reaction_count, c.created_at,
              t.title AS topic_title
       FROM contributions c
       LEFT JOIN topics t ON t.slug = c.topic_slug
       WHERE c.user_id = $1 AND c.is_removed = false
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM contributions WHERE user_id = $1 AND is_removed = false', [id]
    )

    res.json({ contributions: rows, total: parseInt(count), page, limit })
  } catch (err) {
    next(err)
  }
}

export async function getDonations(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' })
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { rows } = await query(
      `SELECT d.id, d.amount, d.currency, d.method, d.status, d.created_at,
              ca.title AS campaign_title, ca.slug AS campaign_slug
       FROM donations d
       LEFT JOIN campaigns ca ON ca.id = d.campaign_id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM donations WHERE user_id = $1', [id]
    )

    res.json({ donations: rows, total: parseInt(count), page, limit })
  } catch (err) {
    next(err)
  }
}

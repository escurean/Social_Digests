import { query } from '../config/db.js'

export async function getQueue(req, res, next) {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit))

    const { rows } = await query(
      `SELECT f.id, f.reason, f.status, f.created_at,
              c.id AS contribution_id, c.body AS contribution_body, c.topic_slug,
              reporter.id AS reporter_id, reporter.name AS reporter_name,
              author.id AS author_id, author.name AS author_name, author.email AS author_email
       FROM flags f
       JOIN contributions c ON c.id = f.contribution_id
       JOIN users reporter ON reporter.id = f.reporter_id
       JOIN users author  ON author.id  = c.user_id
       WHERE f.status = $1
       ORDER BY f.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, Math.min(50, parseInt(limit)), offset]
    )

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM flags WHERE status = $1', [status]
    )

    res.json({ flags: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

export async function dismiss(req, res, next) {
  try {
    const { id } = req.params

    const { rows: [flag] } = await query('SELECT * FROM flags WHERE id = $1', [id])
    if (!flag) return res.status(404).json({ error: 'Flag not found.' })

    await query("UPDATE flags SET status = 'dismissed' WHERE id = $1", [id])
    await query(
      `INSERT INTO moderation_actions (admin_id, flag_id, action_type, note)
       VALUES ($1, $2, 'dismiss', 'Flag dismissed — no action taken.')`,
      [req.user.id, id]
    )

    res.json({ message: 'Flag dismissed.' })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params

    const { rows: [flag] } = await query('SELECT * FROM flags WHERE id = $1', [id])
    if (!flag) return res.status(404).json({ error: 'Flag not found.' })

    const { rows: [contribution] } = await query('SELECT * FROM contributions WHERE id = $1', [flag.contribution_id])
    if (!contribution) return res.status(404).json({ error: 'Contribution not found.' })

    await query('UPDATE contributions SET is_removed = true WHERE id = $1', [contribution.id])
    await query("UPDATE flags SET status = 'resolved' WHERE id = $1", [id])
    await query(
      `UPDATE topics SET contribution_count = GREATEST(0, contribution_count - 1) WHERE slug = $1`,
      [contribution.topic_slug]
    )
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, flag_id, action_type)
       VALUES ($1, $2, $3, 'remove_content')`,
      [req.user.id, contribution.user_id, id]
    )

    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'content_removed', 'One of your contributions was removed by a moderator.', '/topics')`,
      [contribution.user_id]
    )

    res.json({ message: 'Content removed.' })
  } catch (err) {
    next(err)
  }
}

export async function warn(req, res, next) {
  try {
    const { id } = req.params
    const { note } = req.body

    const { rows: [flag] } = await query('SELECT * FROM flags WHERE id = $1', [id])
    if (!flag) return res.status(404).json({ error: 'Flag not found.' })

    const { rows: [contribution] } = await query('SELECT * FROM contributions WHERE id = $1', [flag.contribution_id])
    if (!contribution) return res.status(404).json({ error: 'Contribution not found.' })

    await query("UPDATE flags SET status = 'resolved' WHERE id = $1", [id])
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, flag_id, action_type, note)
       VALUES ($1, $2, $3, 'warn', $4)`,
      [req.user.id, contribution.user_id, id, note?.trim() || null]
    )

    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'warning', $2, '/topics')`,
      [contribution.user_id,
       note?.trim() || 'You have received a warning from a moderator. Please review community guidelines.']
    )

    res.json({ message: 'Warning issued.' })
  } catch (err) {
    next(err)
  }
}

export async function ban(req, res, next) {
  try {
    const { id } = req.params
    const { note } = req.body

    const { rows: [flag] } = await query('SELECT * FROM flags WHERE id = $1', [id])
    if (!flag) return res.status(404).json({ error: 'Flag not found.' })

    const { rows: [contribution] } = await query('SELECT * FROM contributions WHERE id = $1', [flag.contribution_id])
    if (!contribution) return res.status(404).json({ error: 'Contribution not found.' })

    await query('UPDATE users SET is_banned = true WHERE id = $1', [contribution.user_id])
    await query("UPDATE flags SET status = 'resolved' WHERE id = $1", [id])
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, flag_id, action_type, note)
       VALUES ($1, $2, $3, 'ban', $4)`,
      [req.user.id, contribution.user_id, id, note?.trim() || null]
    )

    res.json({ message: 'User banned.' })
  } catch (err) {
    next(err)
  }
}

export async function getUsers(req, res, next) {
  try {
    const { q, role, banned, page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit))

    const conditions = []
    const params = []

    if (q) { params.push(`%${q}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`) }
    if (role) { params.push(role); conditions.push(`u.role = $${params.length}`) }
    if (banned === 'true') conditions.push('u.is_banned = true')
    if (banned === 'false') conditions.push('u.is_banned = false')

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const lim = Math.min(50, parseInt(limit))

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.is_banned, u.created_at,
              COUNT(c.id)::int AS contribution_count
       FROM users u
       LEFT JOIN contributions c ON c.user_id = u.id AND c.is_removed = false
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ${lim} OFFSET ${offset}`,
      params
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM users u ${where}`, params
    )

    res.json({ users: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

export async function banUser(req, res, next) {
  try {
    const { userId } = req.params
    const { note } = req.body

    const { rows: [user] } = await query('SELECT id, is_banned FROM users WHERE id = $1', [userId])
    if (!user) return res.status(404).json({ error: 'User not found.' })

    await query('UPDATE users SET is_banned = true WHERE id = $1', [userId])
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, action_type, note)
       VALUES ($1, $2, 'ban', $3)`,
      [req.user.id, userId, note?.trim() || null]
    )

    res.json({ message: 'User banned.' })
  } catch (err) {
    next(err)
  }
}

export async function unbanUser(req, res, next) {
  try {
    const { userId } = req.params

    const { rows: [user] } = await query('SELECT id FROM users WHERE id = $1', [userId])
    if (!user) return res.status(404).json({ error: 'User not found.' })

    await query('UPDATE users SET is_banned = false WHERE id = $1', [userId])
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, action_type, note)
       VALUES ($1, $2, 'unban', 'Account reinstated.')`,
      [req.user.id, userId]
    )

    res.json({ message: 'User unbanned.' })
  } catch (err) {
    next(err)
  }
}

export async function warnUser(req, res, next) {
  try {
    const { userId } = req.params
    const { note } = req.body

    const { rows: [user] } = await query('SELECT id FROM users WHERE id = $1', [userId])
    if (!user) return res.status(404).json({ error: 'User not found.' })

    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, action_type, note)
       VALUES ($1, $2, 'warn', $3)`,
      [req.user.id, userId, note?.trim() || null]
    )

    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'warning', $2, '/topics')`,
      [userId, note?.trim() || 'You have received a warning from a moderator.']
    )

    res.json({ message: 'Warning issued.' })
  } catch (err) {
    next(err)
  }
}

export async function getStats(req, res, next) {
  try {
    const [users, topics, contributions, flags, proposals, campaigns] = await Promise.all([
      query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_banned)::int AS banned FROM users'),
      query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status=\'active\')::int AS active FROM topics'),
      query('SELECT COUNT(*)::int AS total FROM contributions WHERE is_removed = false'),
      query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='open')::int AS open FROM flags"),
      query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='pending')::int AS pending FROM topic_proposals"),
      query("SELECT COUNT(*)::int AS total, COALESCE(SUM(raised_amount),0)::bigint AS total_raised FROM campaigns WHERE status='active'"),
    ])

    res.json({
      users: users.rows[0],
      topics: topics.rows[0],
      contributions: contributions.rows[0],
      flags: flags.rows[0],
      proposals: proposals.rows[0],
      campaigns: campaigns.rows[0],
    })
  } catch (err) {
    next(err)
  }
}

import { query } from '../config/db.js'

const VALID_QUEUE_STATUSES = ['open', 'dismissed', 'actioned', 'resolved']

// ─── Queue ────────────────────────────────────────────────────────────────────

export async function getQueue(req, res, next) {
  try {
    const { status = 'open', page, limit } = req.query

    // FIX #8: validate status against allowed values — arbitrary strings cause silent empty results
    if (status && !VALID_QUEUE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_QUEUE_STATUSES.join(', ')}` })
    }

    // FIX #3: NaN-safe pagination with parameterized LIMIT/OFFSET
    const lim = Math.min(50, Math.max(1, parseInt(limit) || 20))
    const off = Math.max(0, (Math.max(1, parseInt(page) || 1) - 1) * lim)

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
      [status, lim, off]
    )

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM flags WHERE status = $1', [status]
    )

    res.json({ flags: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

// ─── Dismiss flag ─────────────────────────────────────────────────────────────

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

// ─── Remove content ───────────────────────────────────────────────────────────

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

// ─── Warn via flag ────────────────────────────────────────────────────────────

export async function warn(req, res, next) {
  try {
    const { id } = req.params
    const { note } = req.body

    // FIX #7: bound note length
    if (note && note.trim().length > 2000) {
      return res.status(400).json({ error: 'Note must be under 2000 characters.' })
    }

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

// ─── Ban via flag ─────────────────────────────────────────────────────────────

export async function ban(req, res, next) {
  try {
    const { id } = req.params
    const { note } = req.body

    // FIX #7: bound note length
    if (note && note.trim().length > 2000) {
      return res.status(400).json({ error: 'Note must be under 2000 characters.' })
    }

    const { rows: [flag] } = await query('SELECT * FROM flags WHERE id = $1', [id])
    if (!flag) return res.status(404).json({ error: 'Flag not found.' })

    const { rows: [contribution] } = await query('SELECT * FROM contributions WHERE id = $1', [flag.contribution_id])
    if (!contribution) return res.status(404).json({ error: 'Contribution not found.' })

    const targetUserId = contribution.user_id

    // FIX #10: prevent self-ban
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban your own account.' })
    }

    await query('UPDATE users SET is_banned = true WHERE id = $1', [targetUserId])

    // FIX #1: revoke all sessions immediately so ban takes effect within seconds,
    // not after the current access token's 15-minute TTL expires
    await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [targetUserId])

    await query("UPDATE flags SET status = 'resolved' WHERE id = $1", [id])
    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, flag_id, action_type, note)
       VALUES ($1, $2, $3, 'ban', $4)`,
      [req.user.id, targetUserId, id, note?.trim() || null]
    )

    // FIX #12: notify the banned user so they know why they can no longer log in
    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'account_banned', 'Your account has been suspended for violating community guidelines.', '/')`,
      [targetUserId]
    )

    res.json({ message: 'User banned.' })
  } catch (err) {
    next(err)
  }
}

// ─── Users list ───────────────────────────────────────────────────────────────

export async function getUsers(req, res, next) {
  try {
    const { q, role, banned, page, limit } = req.query

    // FIX #3: NaN-safe pagination — push lim/off to params for parameterized LIMIT/OFFSET
    const lim = Math.min(50, Math.max(1, parseInt(limit) || 20))
    const off = Math.max(0, (Math.max(1, parseInt(page) || 1) - 1) * lim)

    const conditions = []
    const params = []

    if (q) { params.push(`%${q}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`) }
    if (role) { params.push(role); conditions.push(`u.role = $${params.length}`) }
    if (banned === 'true')  conditions.push('u.is_banned = true')
    if (banned === 'false') conditions.push('u.is_banned = false')

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // Push pagination params last so their indices are stable
    params.push(lim, off)
    const limIdx = params.length - 1
    const offIdx = params.length

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.is_banned, u.created_at,
              COUNT(c.id)::int AS contribution_count
       FROM users u
       LEFT JOIN contributions c ON c.user_id = u.id AND c.is_removed = false
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${limIdx} OFFSET $${offIdx}`,
      params
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM users u ${where}`, params.slice(0, -2)
    )

    res.json({ users: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

// ─── Direct ban user ──────────────────────────────────────────────────────────

export async function banUser(req, res, next) {
  try {
    const { userId } = req.params
    const { note } = req.body

    // FIX #7: bound note length
    if (note && note.trim().length > 2000) {
      return res.status(400).json({ error: 'Note must be under 2000 characters.' })
    }

    // FIX #10: prevent self-ban
    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot ban your own account.' })
    }

    const { rows: [user] } = await query('SELECT id, is_banned FROM users WHERE id = $1', [userId])
    if (!user) return res.status(404).json({ error: 'User not found.' })

    await query('UPDATE users SET is_banned = true WHERE id = $1', [userId])

    // FIX #1: revoke all sessions immediately
    await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [userId])

    await query(
      `INSERT INTO moderation_actions (admin_id, target_user_id, action_type, note)
       VALUES ($1, $2, 'ban', $3)`,
      [req.user.id, userId, note?.trim() || null]
    )

    // FIX #12: notify the banned user
    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'account_banned', 'Your account has been suspended for violating community guidelines.', '/')`,
      [userId]
    )

    res.json({ message: 'User banned.' })
  } catch (err) {
    next(err)
  }
}

// ─── Unban user ───────────────────────────────────────────────────────────────

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

// ─── Warn user directly ───────────────────────────────────────────────────────

export async function warnUser(req, res, next) {
  try {
    const { userId } = req.params
    const { note } = req.body

    // FIX #7: bound note length
    if (note && note.trim().length > 2000) {
      return res.status(400).json({ error: 'Note must be under 2000 characters.' })
    }

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

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(req, res, next) {
  try {
    const [users, topics, contributions, flags, proposals, campaigns] = await Promise.all([
      query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_banned)::int AS banned FROM users'),
      query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='active')::int AS active FROM topics"),
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

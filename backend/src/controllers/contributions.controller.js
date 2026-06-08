import { query } from '../config/db.js'
import { getCache, setCache, invalidate } from '../services/cache.js'

const CONTRIBUTIONS_TTL = 60 // seconds

export async function list(req, res, next) {
  try {
    const { slug } = req.params
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const cacheKey = `contributions:${slug}:p${page}:l${limit}`
    const cached = await getCache(cacheKey)
    if (cached && !req.user) return res.json(cached)

    const { rows } = await query(
      `SELECT c.id, c.body, c.parent_id, c.reaction_count, c.is_removed, c.created_at,
              u.id AS user_id, u.name AS user_name, u.avatar_url, u.role AS user_role
       FROM contributions c
       JOIN users u ON u.id = c.user_id
       WHERE c.topic_slug = $1 AND c.is_removed = false AND c.parent_id IS NULL
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [slug, limit, offset]
    )

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM contributions WHERE topic_slug = $1 AND is_removed = false AND parent_id IS NULL',
      [slug]
    )

    const userReactions = {}
    if (req.user && rows.length) {
      const ids = rows.map((r) => r.id)
      const { rows: reactions } = await query(
        `SELECT contribution_id, type FROM contribution_reactions
         WHERE user_id = $1 AND contribution_id = ANY($2)`,
        [req.user.id, ids]
      )
      reactions.forEach((r) => { userReactions[r.contribution_id] = r.type })
    }

    const payload = {
      contributions: rows.map((c) => ({ ...c, my_reaction: userReactions[c.id] || null })),
      total: parseInt(count), page, limit,
    }

    // Only cache unauthenticated view (reactions are user-specific)
    if (!req.user) await setCache(cacheKey, payload, CONTRIBUTIONS_TTL)

    res.json(payload)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const { slug } = req.params
    const { body, parent_id } = req.body

    if (!body?.trim())              return res.status(400).json({ error: 'Body is required.' })
    if (body.trim().length < 10)   return res.status(400).json({ error: 'Contribution must be at least 10 characters.' })
    if (body.trim().length > 5000) return res.status(400).json({ error: 'Contribution must be at most 5000 characters.' })

    const { rows: topics } = await query(
      "SELECT slug FROM topics WHERE slug = $1 AND status != 'draft'", [slug]
    )
    if (!topics.length) return res.status(404).json({ error: 'Topic not found.' })

    const { rows: [contribution] } = await query(
      `INSERT INTO contributions (topic_slug, user_id, body, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, parent_id, reaction_count, is_removed, created_at`,
      [slug, req.user.id, body.trim(), parent_id || null]
    )

    await query('UPDATE topics SET contribution_count = contribution_count + 1 WHERE slug = $1', [slug])

    // Invalidate all cached pages for this topic
    await invalidate(`contributions:${slug}:*`)

    const { rows: [user] } = await query(
      'SELECT id, name, avatar_url, role FROM users WHERE id = $1', [req.user.id]
    )

    res.status(201).json({
      ...contribution,
      user_id: user.id, user_name: user.name, avatar_url: user.avatar_url, user_role: user.role,
      my_reaction: null,
    })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params
    const { body } = req.body

    if (!body?.trim()) return res.status(400).json({ error: 'Body is required.' })

    const { rows: [c] } = await query('SELECT * FROM contributions WHERE id = $1', [id])
    if (!c) return res.status(404).json({ error: 'Contribution not found.' })
    if (c.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' })
    if (c.is_removed) return res.status(410).json({ error: 'Contribution has been removed.' })

    const { rows: [updated] } = await query(
      'UPDATE contributions SET body = $1 WHERE id = $2 RETURNING *',
      [body.trim(), id]
    )

    await invalidate(`contributions:${c.topic_slug}:*`)

    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params
    const { rows: [c] } = await query('SELECT * FROM contributions WHERE id = $1', [id])
    if (!c) return res.status(404).json({ error: 'Contribution not found.' })
    if (c.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' })

    await query('UPDATE contributions SET is_removed = true WHERE id = $1', [id])
    await query(
      'UPDATE topics SET contribution_count = GREATEST(0, contribution_count - 1) WHERE slug = $1',
      [c.topic_slug]
    )

    await invalidate(`contributions:${c.topic_slug}:*`)

    res.json({ message: 'Contribution removed.' })
  } catch (err) {
    next(err)
  }
}

export async function flag(req, res, next) {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required.' })
    // FIX #12: enforce upper bound to prevent DB abuse
    if (reason.trim().length > 1000) return res.status(400).json({ error: 'Reason must be under 1000 characters.' })

    const { rows: [c] } = await query('SELECT * FROM contributions WHERE id = $1', [id])
    if (!c) return res.status(404).json({ error: 'Contribution not found.' })
    if (c.is_removed) return res.status(410).json({ error: 'Contribution has been removed.' })

    const { rows: existing } = await query(
      'SELECT id FROM flags WHERE contribution_id = $1 AND reporter_id = $2', [id, req.user.id]
    )
    if (existing.length) return res.status(409).json({ error: 'You have already flagged this contribution.' })

    await query(
      'INSERT INTO flags (contribution_id, reporter_id, reason) VALUES ($1, $2, $3)',
      [id, req.user.id, reason.trim()]
    )
    res.status(201).json({ message: 'Contribution flagged for review.' })
  } catch (err) {
    next(err)
  }
}

export async function react(req, res, next) {
  try {
    const { id } = req.params
    const { type } = req.body

    const VALID = ['like', 'agree', 'disagree', 'insightful']
    if (!VALID.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID.join(', ')}` })
    }

    const { rows: [c] } = await query('SELECT * FROM contributions WHERE id = $1', [id])
    if (!c) return res.status(404).json({ error: 'Contribution not found.' })
    if (c.is_removed) return res.status(410).json({ error: 'Contribution has been removed.' })
    if (c.user_id === req.user.id) return res.status(400).json({ error: 'Cannot react to your own contribution.' })

    const { rows: existing } = await query(
      'SELECT id, type FROM contribution_reactions WHERE contribution_id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (existing.length) {
      if (existing[0].type === type) {
        await query('DELETE FROM contribution_reactions WHERE contribution_id = $1 AND user_id = $2', [id, req.user.id])
        await query('UPDATE contributions SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = $1', [id])
        return res.json({ reacted: false, type: null })
      }
      await query(
        'UPDATE contribution_reactions SET type = $1 WHERE contribution_id = $2 AND user_id = $3',
        [type, id, req.user.id]
      )
    } else {
      await query(
        'INSERT INTO contribution_reactions (contribution_id, user_id, type) VALUES ($1, $2, $3)',
        [id, req.user.id, type]
      )
      await query('UPDATE contributions SET reaction_count = reaction_count + 1 WHERE id = $1', [id])
    }

    res.json({ reacted: true, type })
  } catch (err) {
    next(err)
  }
}

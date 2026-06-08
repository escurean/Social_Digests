import { query } from '../config/db.js'

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337'

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

async function createTopicInStrapi(proposal) {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) return null
  try {
    // Resolve Strapi category ID from slug
    let categoryId = null
    if (proposal.category_slug) {
      const catRes = await fetch(
        `${STRAPI_URL}/api/topic-categories?filters[slug][$eq]=${proposal.category_slug}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (catRes.ok) {
        const catData = await catRes.json()
        categoryId = catData?.data?.[0]?.id ?? null
      }
    }

    const slug = slugify(proposal.title)
    const payload = {
      title: proposal.title,
      slug,
      context: proposal.description || null,
      status: 'active',
      publishedAt: new Date().toISOString(),
      ...(categoryId && { category: categoryId }),
    }

    const res = await fetch(`${STRAPI_URL}/api/topics`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    })
    if (!res.ok) return null
    const created = await res.json()
    return created?.data?.attributes?.slug ?? slug
  } catch {
    return null
  }
}

export async function submit(req, res, next) {
  try {
    const { title, description, category_slug } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!description?.trim()) return res.status(400).json({ error: 'Description is required.' })

    const { rows: [proposal] } = await query(
      `INSERT INTO topic_proposals (user_id, title, description, category_slug)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, title.trim(), description.trim(), category_slug || null]
    )

    res.status(201).json(proposal)
  } catch (err) {
    next(err)
  }
}

export async function list(req, res, next) {
  try {
    const { status, page, limit } = req.query

    const lim = Math.min(50, Math.max(1, parseInt(limit) || 20))
    const off = Math.max(0, (Math.max(1, parseInt(page) || 1) - 1) * lim)

    const conditions = []
    const params = []
    if (status) { params.push(status); conditions.push(`p.status = $${params.length}`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    params.push(lim, off)
    const limIdx = params.length - 1
    const offIdx = params.length

    const { rows } = await query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email,
              r.name AS reviewed_by_name
       FROM topic_proposals p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN users r ON r.id = p.reviewed_by
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${limIdx} OFFSET $${offIdx}`,
      params
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM topic_proposals p ${where}`, params.slice(0, -2)
    )

    res.json({ proposals: rows, total: parseInt(count) })
  } catch (err) {
    next(err)
  }
}

export async function approve(req, res, next) {
  try {
    const { id } = req.params

    const { rows: [proposal] } = await query('SELECT * FROM topic_proposals WHERE id = $1', [id])
    if (!proposal) return res.status(404).json({ error: 'Proposal not found.' })
    if (proposal.status !== 'pending') return res.status(409).json({ error: 'Proposal is not pending.' })

    const { rows: [updated] } = await query(
      `UPDATE topic_proposals
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    )

    // Create the topic in Strapi (public CMS) and sync to Express topics table
    const topicSlug = await createTopicInStrapi(proposal)
    if (topicSlug) {
      await query(
        `INSERT INTO topics (slug, title, context, category_slug, status, is_featured)
         VALUES ($1,$2,$3,$4,'active',false)
         ON CONFLICT (slug) DO NOTHING`,
        [topicSlug, proposal.title, proposal.description || null, proposal.category_slug || null]
      )
    }

    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'proposal_approved', $2, $3)`,
      [proposal.user_id,
       `Your topic proposal "${proposal.title}" has been approved!`,
       topicSlug ? `/topics/${topicSlug}` : '/topics']
    )

    res.json({ ...updated, topic_slug: topicSlug })
  } catch (err) {
    next(err)
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.params
    const { reason } = req.body

    const { rows: [proposal] } = await query('SELECT * FROM topic_proposals WHERE id = $1', [id])
    if (!proposal) return res.status(404).json({ error: 'Proposal not found.' })
    if (proposal.status !== 'pending') return res.status(409).json({ error: 'Proposal is not pending.' })

    const { rows: [updated] } = await query(
      `UPDATE topic_proposals
       SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason?.trim() || null, req.user.id, id]
    )

    await query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES ($1, 'proposal_rejected', $2, $3)`,
      [proposal.user_id,
       `Your topic proposal "${proposal.title}" was not accepted at this time.`,
       '/propose']
    )

    res.json(updated)
  } catch (err) {
    next(err)
  }
}

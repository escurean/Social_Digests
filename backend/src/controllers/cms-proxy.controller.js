import { query } from '../config/db.js'

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337'

// ── Strapi HTTP helpers ────────────────────────────────────────

function strapiAuthHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw Object.assign(new Error('STRAPI_API_TOKEN is not configured in backend environment.'), { status: 503 })
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function strapiRequest(method, path, params = null, body = null) {
  let url = `${STRAPI_URL}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    url += `?${qs}`
  }
  const opts = { method, headers: strapiAuthHeaders() }
  if (body !== null) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || err.message || `Strapi ${res.status}`
    throw Object.assign(new Error(msg), { status: res.status >= 400 && res.status < 500 ? res.status : 502 })
  }
  return method === 'DELETE' ? null : res.json()
}

// Strapi uid fields don't auto-generate via REST API — we must supply the slug.
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Flatten Strapi v4  { id, attributes: { … } }  →  { strapiId, …fields }
// Recursively normalizes nested data/attributes wrappers.
function normalizeItem(item) {
  if (!item) return null
  const { id, attributes } = item
  if (!attributes) return item
  const flat = { strapiId: id, ...attributes }
  for (const key of Object.keys(flat)) {
    const val = flat[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && 'data' in val) {
      if (Array.isArray(val.data))    flat[key] = val.data.map(normalizeItem)
      else if (val.data === null)     flat[key] = null
      else                            flat[key] = normalizeItem(val.data)
    }
  }
  return flat
}

function normalizeList(response) {
  return (response?.data ?? []).map(normalizeItem)
}

// ── Upload proxy ──────────────────────────────────────────────

export async function uploadFile(req, res, next) {
  try {
    const token = process.env.STRAPI_API_TOKEN
    if (!token) return res.status(503).json({ error: 'STRAPI_API_TOKEN not configured.' })
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Request must be multipart/form-data.' })
    }

    // Collect the raw body then forward to Strapi
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)

    const strapiRes = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body,
    })
    if (!strapiRes.ok) {
      const err = await strapiRes.json().catch(() => ({}))
      return res.status(strapiRes.status).json({ error: err?.error?.message || 'Upload failed.' })
    }
    const [media] = await strapiRes.json()
    res.json(media)
  } catch (err) {
    next(err)
  }
}

// ── Topics proxy ───────────────────────────────────────────────

export async function listTopics(req, res, next) {
  try {
    const data = await strapiRequest('GET', '/api/topics', {
      'populate[images]': '*',
      'populate[category]': '*',
      'publicationState': 'preview',
      'pagination[pageSize]': 100,
      'sort': 'createdAt:desc',
    })

    const topics = normalizeList(data).map((t) => ({
      ...t,
      category_slug: t.category?.slug   ?? null,
      category_name: t.category?.name   ?? null,
    }))

    if (topics.length) {
      const slugs = topics.map((t) => t.slug).filter(Boolean)
      const { rows } = await query(
        'SELECT slug, contribution_count FROM topics WHERE slug = ANY($1)',
        [slugs]
      )
      const countMap = Object.fromEntries(rows.map((r) => [r.slug, r.contribution_count]))
      topics.forEach((t) => { t.contribution_count = countMap[t.slug] ?? 0 })
    }

    res.json({ topics, total: topics.length })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function getTopic(req, res, next) {
  try {
    const { slug } = req.params
    const data = await strapiRequest('GET', '/api/topics', {
      'filters[slug][$eq]': slug,
      'populate[images]': '*',
      'populate[category]': '*',
      'publicationState': 'preview',
    })
    if (!data.data?.length) return res.status(404).json({ error: 'Topic not found in CMS.' })

    const topic = normalizeItem(data.data[0])
    topic.category_slug = topic.category?.slug ?? null
    topic.category_name = topic.category?.name ?? null

    const { rows: [row] } = await query(
      'SELECT contribution_count FROM topics WHERE slug = $1', [slug]
    )
    topic.contribution_count = row?.contribution_count ?? 0

    res.json(topic)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function createTopic(req, res, next) {
  try {
    const { title, context, category_slug, status = 'draft', is_featured = false, imageIds = [] } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })

    let categoryId = null
    if (category_slug) {
      const catData = await strapiRequest('GET', '/api/topic-categories', {
        'filters[slug][$eq]': category_slug,
        'fields[0]': 'id',
      })
      categoryId = catData.data?.[0]?.id ?? null
    }

    const payload = {
      title: title.trim(),
      slug: slugify(title.trim()),
      context: context?.trim() || null,
      status,
      is_featured,
      publishedAt: status !== 'draft' ? new Date().toISOString() : null,
      ...(imageIds.length && { images: imageIds }),
      ...(categoryId !== null && { category: categoryId }),
    }

    const created = await strapiRequest('POST', '/api/topics', null, { data: payload })
    const topic = normalizeItem(created.data)

    // Register slug in Express (needed for contribution FK validation + contribution_count)
    await query(
      `INSERT INTO topics (slug, title, context, category_slug, status, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured`,
      [topic.slug, title.trim(), context?.trim() || null, category_slug || null, status, is_featured]
    )

    topic.category_slug = category_slug ?? null
    topic.contribution_count = 0
    res.status(201).json(topic)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function updateTopic(req, res, next) {
  try {
    const { slug } = req.params
    const { title, context, category_slug, status, is_featured, imageIds } = req.body

    const existing = await strapiRequest('GET', '/api/topics', {
      'filters[slug][$eq]': slug,
      'fields[0]': 'id',
      'publicationState': 'preview',
    })
    if (!existing.data?.length) return res.status(404).json({ error: 'Topic not found in CMS.' })
    const strapiId = existing.data[0].id

    let categoryId = undefined
    if (category_slug !== undefined) {
      if (category_slug) {
        const catData = await strapiRequest('GET', '/api/topic-categories', {
          'filters[slug][$eq]': category_slug, 'fields[0]': 'id',
        })
        categoryId = catData.data?.[0]?.id ?? null
      } else {
        categoryId = null
      }
    }

    const payload = {}
    if (title       !== undefined) payload.title       = title.trim()
    if (context     !== undefined) payload.context     = context?.trim() || null
    if (status      !== undefined) {
      payload.status      = status
      payload.publishedAt = status !== 'draft' ? new Date().toISOString() : null
    }
    if (is_featured !== undefined) payload.is_featured = is_featured
    if (imageIds    !== undefined) payload.images      = imageIds
    if (categoryId  !== undefined) payload.category    = categoryId

    const updated = await strapiRequest('PUT', `/api/topics/${strapiId}`, null, { data: payload })
    const topic = normalizeItem(updated.data)

    // Sync to Express
    await query(
      `UPDATE topics SET
         title       = COALESCE($1, title),
         status      = COALESCE($2, status),
         is_featured = COALESCE($3, is_featured),
         updated_at  = NOW()
       WHERE slug = $4`,
      [title?.trim() ?? null, status ?? null, is_featured !== undefined ? is_featured : null, slug]
    )

    topic.category_slug = category_slug ?? topic.category?.slug ?? null
    const { rows: [row] } = await query('SELECT contribution_count FROM topics WHERE slug = $1', [slug])
    topic.contribution_count = row?.contribution_count ?? 0
    res.json(topic)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function deleteTopic(req, res, next) {
  try {
    const { slug } = req.params
    const existing = await strapiRequest('GET', '/api/topics', {
      'filters[slug][$eq]': slug, 'fields[0]': 'id', 'publicationState': 'preview',
    })
    if (!existing.data?.length) return res.status(404).json({ error: 'Topic not found in CMS.' })

    await strapiRequest('DELETE', `/api/topics/${existing.data[0].id}`)
    await query('DELETE FROM topics WHERE slug = $1', [slug])
    res.json({ message: 'Topic deleted.' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

// ── Campaigns proxy ────────────────────────────────────────────

export async function listCampaigns(req, res, next) {
  try {
    const data = await strapiRequest('GET', '/api/donation-campaigns', {
      'populate[images]': '*',
      'publicationState': 'preview',
      'pagination[pageSize]': 100,
      'sort': 'createdAt:desc',
    })

    const campaigns = normalizeList(data)

    if (campaigns.length) {
      const slugs = campaigns.map((c) => c.slug).filter(Boolean)
      const { rows } = await query(
        `SELECT slug, raised_amount, goal_amount, currency,
                CASE WHEN goal_amount > 0
                     THEN ROUND((raised_amount::numeric / goal_amount) * 100, 1)
                     ELSE 0 END AS progress_pct
         FROM campaigns WHERE slug = ANY($1)`,
        [slugs]
      )
      const statsMap = Object.fromEntries(rows.map((r) => [r.slug, r]))
      campaigns.forEach((c) => {
        const s = statsMap[c.slug] ?? {}
        c.raised_amount = s.raised_amount ?? 0
        c.progress_pct  = s.progress_pct  ?? 0
      })
    }

    res.json({ campaigns, total: campaigns.length })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function getCampaign(req, res, next) {
  try {
    const { slug } = req.params
    const data = await strapiRequest('GET', '/api/donation-campaigns', {
      'filters[slug][$eq]': slug,
      'populate[images]': '*',
      'publicationState': 'preview',
    })
    if (!data.data?.length) return res.status(404).json({ error: 'Campaign not found in CMS.' })

    const campaign = normalizeItem(data.data[0])
    const { rows: [stats] } = await query(
      `SELECT raised_amount, goal_amount, currency,
              CASE WHEN goal_amount > 0
                   THEN ROUND((raised_amount::numeric / goal_amount) * 100, 1)
                   ELSE 0 END AS progress_pct,
              (SELECT COUNT(*)::int FROM donations WHERE campaign_id = campaigns.id AND status = 'completed') AS donor_count
       FROM campaigns WHERE slug = $1`,
      [slug]
    )
    if (stats) {
      campaign.raised_amount = stats.raised_amount
      campaign.progress_pct  = stats.progress_pct
      campaign.donor_count   = stats.donor_count
    }

    res.json(campaign)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function createCampaign(req, res, next) {
  try {
    const {
      title, description, goal_amount, currency = 'KES', deadline,
      beneficiary_name, beneficiary_details, status = 'draft', topic_slug, imageIds = [],
    } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!goal_amount || isNaN(goal_amount)) return res.status(400).json({ error: 'goal_amount is required.' })

    const payload = {
      title: title.trim(),
      slug: slugify(title.trim()),
      description: description?.trim() || null,
      goal_amount: parseFloat(goal_amount),
      currency,
      deadline: deadline || null,
      beneficiary_name: beneficiary_name?.trim() || null,
      beneficiary_details: beneficiary_details?.trim() || null,
      status,
      topic_slug: topic_slug || null,
      publishedAt: status !== 'draft' ? new Date().toISOString() : null,
      ...(imageIds.length && { images: imageIds }),
    }

    const created = await strapiRequest('POST', '/api/donation-campaigns', null, { data: payload })
    const campaign = normalizeItem(created.data)

    // Register in Express for financial tracking (donations update raised_amount here)
    await query(
      `INSERT INTO campaigns (slug, title, description, goal_amount, currency, deadline, beneficiary_name, status, topic_slug, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO UPDATE
         SET goal_amount = EXCLUDED.goal_amount, currency = EXCLUDED.currency, status = EXCLUDED.status`,
      [campaign.slug, title.trim(), description?.trim() || null, parseFloat(goal_amount),
       currency, deadline || null, beneficiary_name?.trim() || null, status, topic_slug || null, req.user.id]
    )

    campaign.raised_amount = 0
    campaign.progress_pct  = 0
    res.status(201).json(campaign)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function updateCampaign(req, res, next) {
  try {
    const { slug } = req.params
    const {
      title, description, goal_amount, currency, deadline,
      beneficiary_name, beneficiary_details, status, topic_slug, imageIds,
    } = req.body

    const existing = await strapiRequest('GET', '/api/donation-campaigns', {
      'filters[slug][$eq]': slug, 'fields[0]': 'id', 'publicationState': 'preview',
    })
    if (!existing.data?.length) return res.status(404).json({ error: 'Campaign not found in CMS.' })
    const strapiId = existing.data[0].id

    const payload = {}
    if (title              !== undefined) payload.title              = title.trim()
    if (description        !== undefined) payload.description        = description?.trim() || null
    if (goal_amount        !== undefined) payload.goal_amount        = parseFloat(goal_amount)
    if (currency           !== undefined) payload.currency           = currency
    if (deadline           !== undefined) payload.deadline           = deadline || null
    if (beneficiary_name   !== undefined) payload.beneficiary_name   = beneficiary_name?.trim() || null
    if (beneficiary_details!== undefined) payload.beneficiary_details= beneficiary_details?.trim() || null
    if (topic_slug         !== undefined) payload.topic_slug         = topic_slug || null
    if (imageIds           !== undefined) payload.images             = imageIds
    if (status             !== undefined) {
      payload.status      = status
      payload.publishedAt = status !== 'draft' ? new Date().toISOString() : null
    }

    const updated = await strapiRequest('PUT', `/api/donation-campaigns/${strapiId}`, null, { data: payload })
    const campaign = normalizeItem(updated.data)

    // Sync to Express
    await query(
      `UPDATE campaigns SET
         title            = COALESCE($1, title),
         goal_amount      = COALESCE($2, goal_amount),
         currency         = COALESCE($3, currency),
         status           = COALESCE($4, status),
         deadline         = COALESCE($5, deadline),
         beneficiary_name = COALESCE($6, beneficiary_name),
         topic_slug       = COALESCE($7, topic_slug),
         updated_at       = NOW()
       WHERE slug = $8`,
      [title?.trim() ?? null, goal_amount ? parseFloat(goal_amount) : null,
       currency ?? null, status ?? null, deadline !== undefined ? (deadline || null) : null,
       beneficiary_name?.trim() ?? null, topic_slug !== undefined ? (topic_slug || null) : null, slug]
    )

    const { rows: [stats] } = await query(
      `SELECT raised_amount, CASE WHEN goal_amount > 0 THEN ROUND((raised_amount::numeric / goal_amount) * 100, 1) ELSE 0 END AS progress_pct
       FROM campaigns WHERE slug = $1`, [slug]
    )
    campaign.raised_amount = stats?.raised_amount ?? 0
    campaign.progress_pct  = stats?.progress_pct  ?? 0
    res.json(campaign)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

export async function deleteCampaign(req, res, next) {
  try {
    const { slug } = req.params
    const existing = await strapiRequest('GET', '/api/donation-campaigns', {
      'filters[slug][$eq]': slug, 'fields[0]': 'id', 'publicationState': 'preview',
    })
    if (!existing.data?.length) return res.status(404).json({ error: 'Campaign not found in CMS.' })

    await strapiRequest('DELETE', `/api/donation-campaigns/${existing.data[0].id}`)
    await query('DELETE FROM campaigns WHERE slug = $1', [slug])
    res.json({ message: 'Campaign deleted.' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

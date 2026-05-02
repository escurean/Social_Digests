import { query } from '../config/db.js'

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337'

async function strapiSync(method, path, body = null) {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) return
  try {
    const opts = {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }
    if (body) opts.body = JSON.stringify(body)
    await fetch(`${STRAPI_URL}${path}`, opts)
  } catch {
    // Non-fatal — Express DB is authoritative for categories
  }
}

export async function list(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(t.id)::int AS topic_count
       FROM categories c
       LEFT JOIN topics t ON t.category_slug = c.slug
       GROUP BY c.id
       ORDER BY c.name`
    )
    res.json({ categories: rows })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const { slug, name, description } = req.body
    if (!slug?.trim() || !name?.trim()) return res.status(400).json({ error: 'slug and name are required.' })

    const { rows: [cat] } = await query(
      'INSERT INTO categories (slug, name, description) VALUES ($1,$2,$3) RETURNING *',
      [slug.trim(), name.trim(), description?.trim() || null]
    )

    await strapiSync('POST', '/api/topic-categories', {
      data: { slug: slug.trim(), name: name.trim(), is_active: true, publishedAt: new Date().toISOString() },
    })

    res.status(201).json(cat)
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with that slug already exists.' })
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const { slug } = req.params
    const { name, description } = req.body

    const { rows: [cat] } = await query(
      `UPDATE categories SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE slug = $3 RETURNING *`,
      [name?.trim() || null, description?.trim() || null, slug]
    )
    if (!cat) return res.status(404).json({ error: 'Category not found.' })

    // Sync name change to Strapi
    const strapiRes = await fetch(
      `${STRAPI_URL}/api/topic-categories?filters[slug][$eq]=${slug}`,
      { headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } }
    ).catch(() => null)
    if (strapiRes?.ok) {
      const strapiData = await strapiRes.json().catch(() => null)
      const strapiId = strapiData?.data?.[0]?.id
      if (strapiId) {
        await strapiSync('PUT', `/api/topic-categories/${strapiId}`, {
          data: { name: cat.name },
        })
      }
    }

    res.json(cat)
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [cat] } = await query('SELECT id FROM categories WHERE slug = $1', [slug])
    if (!cat) return res.status(404).json({ error: 'Category not found.' })
    await query('DELETE FROM categories WHERE slug = $1', [slug])

    // Sync deletion to Strapi
    const strapiRes = await fetch(
      `${STRAPI_URL}/api/topic-categories?filters[slug][$eq]=${slug}`,
      { headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } }
    ).catch(() => null)
    if (strapiRes?.ok) {
      const strapiData = await strapiRes.json().catch(() => null)
      const strapiId = strapiData?.data?.[0]?.id
      if (strapiId) await strapiSync('DELETE', `/api/topic-categories/${strapiId}`)
    }

    res.json({ message: 'Category deleted.' })
  } catch (err) {
    next(err)
  }
}

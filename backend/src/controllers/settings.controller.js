import { query } from '../config/db.js'

export async function get(req, res, next) {
  try {
    const { rows: [settings] } = await query('SELECT * FROM site_settings WHERE id = 1')
    res.json(settings || {})
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const { platform_name, tagline, primary_color, support_email, footer_text } = req.body

    const { rows: [settings] } = await query(
      `UPDATE site_settings SET
         platform_name = COALESCE($1, platform_name),
         tagline       = COALESCE($2, tagline),
         primary_color = COALESCE($3, primary_color),
         support_email = COALESCE($4, support_email),
         footer_text   = COALESCE($5, footer_text),
         updated_by    = $6,
         updated_at    = NOW()
       WHERE id = 1 RETURNING *`,
      [platform_name?.trim() || null, tagline?.trim() || null,
       primary_color?.trim() || null, support_email?.trim() || null,
       footer_text?.trim() || null, req.user.id]
    )
    res.json(settings)
  } catch (err) { next(err) }
}

export async function uploadLogo(req, res, next) {
  try {
    const { logo_url } = req.body
    if (!logo_url) return res.status(400).json({ error: 'logo_url is required.' })

    // Accept a data URL (base64) or a plain HTTPS URL
    const isDataUrl  = logo_url.startsWith('data:image/')
    const isHttpsUrl = logo_url.startsWith('https://')
    if (!isDataUrl && !isHttpsUrl) {
      return res.status(400).json({ error: 'logo_url must be a data: image URL or an https:// URL.' })
    }

    // Limit data URL size to ~1 MB (base64 ≈ 4/3 × bytes, 1 MB ≈ 1.37M base64 chars)
    if (isDataUrl && logo_url.length > 1_400_000) {
      return res.status(400).json({ error: 'Logo image is too large (max ~1 MB).' })
    }

    const { rows: [settings] } = await query(
      `UPDATE site_settings SET logo_url = $1, updated_by = $2, updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [logo_url, req.user.id]
    )
    res.json(settings)
  } catch (err) { next(err) }
}

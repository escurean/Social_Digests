import crypto from 'crypto'

// Minimal signed-upload client for Cloudinary (no SDK needed).
// Configure with CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

function config() {
  const raw = process.env.CLOUDINARY_URL
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'cloudinary:') return null
    return { apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password), cloudName: u.hostname }
  } catch {
    return null
  }
}

export const isConfigured = () => config() !== null

// Responsive variants generated on the fly by Cloudinary from the original.
const VARIANTS = { thumbnail: 150, small: 500, medium: 750, large: 1000 }

function variantUrl(url, width) {
  return url.replace('/upload/', `/upload/c_limit,w_${width},f_auto,q_auto/`)
}

/** Upload an image buffer; returns the shape stored in topics.images / campaigns.images. */
export async function uploadImage({ buffer, mimetype, originalname }, folder = 'social-digests') {
  const cfg = config()
  if (!cfg) throw Object.assign(new Error('Image storage is not configured (CLOUDINARY_URL).'), { status: 503 })

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto.createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`)
    .digest('hex')

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimetype }), originalname)
  form.append('api_key', cfg.apiKey)
  form.append('timestamp', String(timestamp))
  form.append('folder', folder)
  form.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: 'POST', body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(body?.error?.message || 'Image upload failed.'), { status: 502 })
  }

  const formats = Object.fromEntries(
    Object.entries(VARIANTS).map(([name, w]) => [
      name,
      { url: variantUrl(body.secure_url, w), width: Math.min(w, body.width) },
    ])
  )
  return {
    id: body.public_id,
    url: body.secure_url,
    formats,
    width: body.width,
    height: body.height,
    name: originalname,
  }
}

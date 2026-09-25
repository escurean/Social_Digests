// Media objects → compact JSON stored in topics.images / campaigns.images.
// Shape matches what frontend/src/utils/strapi.js getImages() consumes.

const FORMATS = ['thumbnail', 'small', 'medium', 'large']

// Accepts a media field in any of these shapes (Strapi shapes kept for the import script):
//   [ { id, url, formats } ]                 (webhook payload / normalized)
//   { data: [ { id, attributes: {...} } ] }  (REST populate)
function toArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (Array.isArray(val.data)) return val.data
  if (val.data) return [val.data]
  return []
}

export function slimMedia(val) {
  return toArray(val)
    .map((item) => {
      const m = item?.attributes ? { id: item.id, ...item.attributes } : item
      if (!m?.url) return null
      const formats = {}
      for (const k of FORMATS) {
        const f = m.formats?.[k]
        if (f?.url) formats[k] = { url: f.url, width: f.width, height: f.height }
      }
      return {
        id: m.id ?? m.strapiId ?? null,
        url: m.url,
        formats,
        width: m.width ?? null,
        height: m.height ?? null,
        name: m.name ?? null,
      }
    })
    .filter(Boolean)
}

// For client-supplied images (admin forms): keep only well-formed https media.
export function sanitizeImages(val) {
  const isHttps = (u) => typeof u === 'string' && u.startsWith('https://')
  return slimMedia(val)
    .filter((img) => isHttps(img.url))
    .map((img) => ({
      ...img,
      formats: Object.fromEntries(Object.entries(img.formats).filter(([, f]) => isHttps(f.url))),
    }))
}

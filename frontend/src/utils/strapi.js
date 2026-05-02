const STRAPI_BASE = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRAPI_URL : null) || 'http://localhost:1337'

// Strapi local-storage provider returns relative URLs (/uploads/…).
// Prepend the Strapi origin so they resolve correctly from any frontend port.
function absoluteUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${STRAPI_BASE}${url}`
}

/**
 * Strapi v4 response normalizer.
 *
 * Strapi v4 wraps every item in { id, attributes: { … } } and every
 * relation in { data: <item | items | null> }.  These helpers flatten
 * that into plain objects so the rest of the frontend never has to
 * know about the Strapi response envelope.
 */

// Flatten one { id, attributes } item, recursing into nested relations.
export function normalizeItem(item) {
  if (!item) return null
  const { id, attributes } = item
  if (!attributes) return item   // already flat (e.g. upload media object)
  const flat = { strapiId: id, ...attributes }

  for (const key of Object.keys(flat)) {
    const val = flat[key]
    // Relation wrapper: { data: <item | [items] | null> }
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && 'data' in val) {
      if (Array.isArray(val.data))    flat[key] = val.data.map(normalizeItem)
      else if (val.data === null)     flat[key] = null
      else                            flat[key] = normalizeItem(val.data)
    }
  }
  return flat
}

// Normalize a Strapi list response: { data: [...], meta: { pagination } }
export function normalizeList(response) {
  if (!response?.data) return []
  const arr = Array.isArray(response.data) ? response.data : [response.data]
  return arr.map(normalizeItem)
}

// Normalize a Strapi single-item response: { data: { id, attributes } }
export function normalizeSingle(response) {
  if (!response?.data) return null
  return normalizeItem(response.data)
}

// ── Image helpers ──────────────────────────────────────────────

/**
 * Given a normalized topic/campaign, return the images array as a
 * consistent list of { id, url, formats, width, height, name }.
 */
export function getImages(item) {
  const imgs = item?.images
  if (!imgs) return []
  if (Array.isArray(imgs)) {
    return imgs.map((img) => ({
      id:      img.strapiId ?? img.id,
      url:     absoluteUrl(img.url),
      formats: Object.fromEntries(
        Object.entries(img.formats ?? {}).map(([k, v]) => [k, { ...v, url: absoluteUrl(v?.url) }])
      ),
      width:   img.width,
      height:  img.height,
      name:    img.name,
    }))
  }
  return []
}

/**
 * Return the best available URL for a single image object.
 * Prefers `preferFormat` (default "medium"), then "small", then original.
 */
export function getImageUrl(img, preferFormat = 'medium') {
  if (!img) return null
  return img.formats?.[preferFormat]?.url
    ?? img.formats?.small?.url
    ?? img.url
    ?? null
}

/** Return the URL of the first image in an item, or null. */
export function getPrimaryImageUrl(item, format = 'medium') {
  return getImageUrl(getImages(item)[0] ?? null, format)
}

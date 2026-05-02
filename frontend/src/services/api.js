import axios from 'axios'
import useAuthStore from '../store/authStore.js'

const API_URL    = import.meta.env.VITE_API_URL    || 'http://localhost:3001'
const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

export const strapiApi = axios.create({
  baseURL: STRAPI_URL,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  register:      (data)       => api.post('/api/auth/register', data),
  login:         (data)       => api.post('/api/auth/login', data),
  google:        (credential) => api.post('/api/auth/google', { credential }),
  me:            ()           => api.get('/api/auth/me'),
  logout:        ()           => api.post('/api/auth/logout'),
  forgotPassword:(email)      => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data)       => api.post('/api/auth/reset-password', data),
}

// ── Users ─────────────────────────────────────────────────────
export const users = {
  getProfile:      (id)          => api.get(`/api/users/${id}`),
  updateProfile:   (id, data)    => api.patch(`/api/users/${id}`, data),
  getContributions:(id, params)  => api.get(`/api/users/${id}/contributions`, { params }),
  getDonations:    (id)          => api.get(`/api/users/${id}/donations`),
}

// ── Contributions ─────────────────────────────────────────────
export const contributions = {
  list:   (slug, params) => api.get(`/api/topics/${slug}/contributions`, { params }),
  create: (slug, data)   => api.post(`/api/topics/${slug}/contributions`, data),
  update: (id, data)     => api.patch(`/api/contributions/${id}`, data),
  remove: (id)           => api.delete(`/api/contributions/${id}`),
  flag:   (id, reason)   => api.post(`/api/contributions/${id}/flag`, { reason }),
  react:  (id, type)     => api.post(`/api/contributions/${id}/react`, { type }),
}

// ── Proposals ─────────────────────────────────────────────────
export const proposals = {
  submit:  (data)         => api.post('/api/proposals', data),
  list:    (params)       => api.get('/api/proposals', { params }),
  approve: (id)           => api.post(`/api/proposals/${id}/approve`),
  reject:  (id, reason)   => api.post(`/api/proposals/${id}/reject`, { reason }),
}

// ── Categories (Express — used for admin forms) ───────────────
export const categories = {
  list:   ()             => api.get('/api/categories'),
  create: (data)         => api.post('/api/categories', data),
  update: (slug, data)   => api.patch(`/api/categories/${slug}`, data),
  remove: (slug)         => api.delete(`/api/categories/${slug}`),
}

// ── Platform stats (Express — public) ────────────────────────
export const platformStats = {
  get: () => api.get('/api/stats'),
}

// ── Campaigns — financial stats only (Express) ───────────────
// Content is fetched from Strapi via `content.campaigns` or `cmsAdmin.campaigns`.
// This namespace is retained for the donation stats endpoint used by CampaignDetailPage.
export const campaigns = {
  stats: (slug) => api.get(`/api/campaigns/${slug}/stats`),
}

// ── Donations ─────────────────────────────────────────────────
export const donations = {
  initiate:        (data) => api.post('/api/donations/initiate', data),
  getStatus:       (id)   => api.get(`/api/donations/${id}/status`),
  confirmStripe:   (data) => api.post('/api/donations/stripe/confirm', data),
}

// ── Moderation ────────────────────────────────────────────────
export const moderation = {
  getStats:   ()           => api.get('/api/moderation/stats'),
  getQueue:   (params)     => api.get('/api/moderation/queue', { params }),
  getUsers:   (params)     => api.get('/api/moderation/users', { params }),
  dismiss:    (id)         => api.post(`/api/moderation/${id}/dismiss`),
  remove:     (id)         => api.post(`/api/moderation/${id}/remove`),
  warn:       (id, note)   => api.post(`/api/moderation/${id}/warn`, { note }),
  ban:        (id, note)   => api.post(`/api/moderation/${id}/ban`, { note }),
  banUser:    (uid, note)  => api.post(`/api/moderation/users/${uid}/ban`, { note }),
  unbanUser:  (uid)        => api.post(`/api/moderation/users/${uid}/unban`),
  warnUser:   (uid, note)  => api.post(`/api/moderation/users/${uid}/warn`, { note }),
}

// ── Notifications ─────────────────────────────────────────────
export const notifications = {
  list:        () => api.get('/api/notifications'),
  markRead:    (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
}

// ── Banners ───────────────────────────────────────────────────
export const banners = {
  list:       ()         => api.get('/api/banners'),
  listActive: ()         => api.get('/api/banners/active'),
  create:     (data)     => api.post('/api/banners', data),
  update:     (id, data) => api.patch(`/api/banners/${id}`, data),
  toggle:     (id)       => api.post(`/api/banners/${id}/toggle`),
  remove:     (id)       => api.delete(`/api/banners/${id}`),
}

// ── Email templates ───────────────────────────────────────────
export const emailTemplates = {
  list:   ()           => api.get('/api/email-templates'),
  get:    (key)        => api.get(`/api/email-templates/${key}`),
  update: (key, data)  => api.patch(`/api/email-templates/${key}`, data),
  toggle: (key)        => api.post(`/api/email-templates/${key}/toggle`),
}

// ── Static pages ──────────────────────────────────────────────
export const staticPages = {
  list:   ()            => api.get('/api/pages'),
  get:    (slug)        => api.get(`/api/pages/${slug}`),
  create: (data)        => api.post('/api/pages', data),
  update: (slug, data)  => api.patch(`/api/pages/${slug}`, data),
  remove: (slug)        => api.delete(`/api/pages/${slug}`),
}

// ── Site settings ─────────────────────────────────────────────
export const siteSettings = {
  get:        ()          => api.get('/api/settings'),
  update:     (data)      => api.patch('/api/settings', data),
  uploadLogo: (logo_url)  => api.post('/api/settings/logo', { logo_url }),
}

// ── CMS Admin proxy (Express → Strapi, token stays server-side) ──
// Used by all admin pages that manage Topics and Campaigns.
export const cmsAdmin = {
  topics: {
    list:   ()             => api.get('/api/cms/topics'),
    get:    (slug)         => api.get(`/api/cms/topics/${slug}`),
    create: (data)         => api.post('/api/cms/topics', data),
    update: (slug, data)   => api.put(`/api/cms/topics/${slug}`, data),
    remove: (slug)         => api.delete(`/api/cms/topics/${slug}`),
  },
  campaigns: {
    list:   ()             => api.get('/api/cms/campaigns'),
    get:    (slug)         => api.get(`/api/cms/campaigns/${slug}`),
    create: (data)         => api.post('/api/cms/campaigns', data),
    update: (slug, data)   => api.put(`/api/cms/campaigns/${slug}`, data),
    remove: (slug)         => api.delete(`/api/cms/campaigns/${slug}`),
  },
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('files', file)
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/api/cms/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || err?.error || 'Image upload failed.')
    }
    return res.json()
  },
}

// ── Public content (direct Strapi reads — no auth required) ───
// Public pages use these to read CMS-managed content.
// Responses must be normalized with normalizeList / normalizeItem
// from frontend/src/utils/strapi.js before use.
export const content = {
  topics: {
    list: (params = {}) => strapiApi.get('/api/topics', {
      params: {
        'populate[images]': '*',
        'populate[category]': '*',
        'pagination[pageSize]': 50,
        'sort': 'createdAt:desc',
        ...params,
      },
    }),
    get: (slug) => strapiApi.get('/api/topics', {
      params: {
        'filters[slug][$eq]': slug,
        'populate[images]': '*',
        'populate[category]': '*',
      },
    }),
    featured: () => strapiApi.get('/api/topics', {
      params: {
        'filters[is_featured][$eq]': true,
        'filters[status][$eq]': 'active',
        'populate[images]': '*',
        'populate[category]': '*',
      },
    }),
    byTopicSlug: (topicSlug) => strapiApi.get('/api/donation-campaigns', {
      params: {
        'filters[topic_slug][$eq]': topicSlug,
        'populate[images]': '*',
      },
    }),
  },
  campaigns: {
    list: (params = {}) => strapiApi.get('/api/donation-campaigns', {
      params: {
        'populate[images]': '*',
        'pagination[pageSize]': 50,
        'sort': 'createdAt:desc',
        ...params,
      },
    }),
    get: (slug) => strapiApi.get('/api/donation-campaigns', {
      params: {
        'filters[slug][$eq]': slug,
        'populate[images]': '*',
      },
    }),
    byTopicSlug: (topicSlug) => strapiApi.get('/api/donation-campaigns', {
      params: {
        'filters[topic_slug][$eq]': topicSlug,
        'populate[images]': '*',
      },
    }),
    active: () => strapiApi.get('/api/donation-campaigns', {
      params: {
        'filters[status][$eq]': 'active',
        'populate[images]': '*',
      },
    }),
  },
  categories: {
    list: () => strapiApi.get('/api/topic-categories', {
      params: {
        'filters[is_active][$eq]': true,
        'sort': 'sort_order:asc',
      },
    }),
  },
  banners: {
    active: () => strapiApi.get('/api/banners', {
      params: { 'filters[is_active][$eq]': true },
    }),
  },
  pages: {
    get:         (slug) => strapiApi.get('/api/pages', {
      params: { 'filters[slug][$eq]': slug },
    }),
    footerPages: ()     => strapiApi.get('/api/pages', {
      params: { 'filters[show_in_footer][$eq]': true },
    }),
  },
  siteSettings: {
    get: () => strapiApi.get('/api/site-setting', {
      params: { 'populate[logo]': '*' },
    }),
  },
}

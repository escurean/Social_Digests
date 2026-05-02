'use strict'

// Fixed dev token — backend/.env and docker-compose must have STRAPI_API_TOKEN=social_digests_backend_dev_token_2024
const BACKEND_SERVICE_TOKEN = 'social_digests_backend_dev_token_2024'

const PUBLIC_ACTIONS = [
  'api::topic.topic.find',
  'api::topic.topic.findOne',
  'api::donation-campaign.donation-campaign.find',
  'api::donation-campaign.donation-campaign.findOne',
  'api::topic-category.topic-category.find',
  'api::topic-category.topic-category.findOne',
]

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    await setPublicPermissions(strapi)
    await ensureBackendApiToken(strapi)
  },
}

async function setPublicPermissions(strapi) {
  try {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } })

    if (!publicRole) return

    for (const action of PUBLIC_ACTIONS) {
      const exists = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: { id: publicRole.id } } })

      if (!exists) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action, role: publicRole.id, enabled: true },
        })
        strapi.log.info(`[bootstrap] Granted public permission: ${action}`)
      }
    }
  } catch (e) {
    strapi.log.error('[bootstrap] Could not set public permissions:', e.message)
  }
}

async function ensureBackendApiToken(strapi) {
  try {
    const crypto = require('crypto')
    // Strapi stores HMAC-SHA512(salt, plainToken) — compute the expected stored hash
    const salt = strapi.config.get('admin.apiToken.salt')
    const hashedKey = crypto.createHmac('sha512', salt).update(BACKEND_SERVICE_TOKEN).digest('hex')

    const existing = await strapi.query('admin::api-token').findOne({ where: { name: 'Backend Service' } })

    if (!existing) {
      await strapi.query('admin::api-token').create({
        data: {
          name: 'Backend Service',
          description: 'Token used by the Express backend to manage content via Strapi API',
          type: 'full-access',
          lifespan: null,
          accessKey: hashedKey,
        },
      })
      strapi.log.info('[bootstrap] Backend Service API token created.')
    } else if (existing.accessKey !== hashedKey) {
      await strapi.query('admin::api-token').update({
        where: { id: existing.id },
        data: { accessKey: hashedKey },
      })
      strapi.log.info('[bootstrap] Backend Service API token access key corrected.')
    } else {
      strapi.log.info('[bootstrap] Backend Service API token already correct.')
    }
  } catch (e) {
    strapi.log.warn('[bootstrap] Could not ensure backend API token:', e.message)
  }
}

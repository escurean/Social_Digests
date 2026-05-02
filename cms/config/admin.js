'use strict'

module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'dev_admin_jwt_secret'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'dev_api_token_salt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'dev_transfer_token_salt'),
    },
  },
})

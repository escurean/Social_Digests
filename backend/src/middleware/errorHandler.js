import * as Sentry from '@sentry/node'
import { logger } from '../services/logger.js'

export default function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500

  if (status >= 500) {
    logger.error({
      event: 'server.error',
      err: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    }, 'Unhandled server error')

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        user: req.user ? { id: req.user.id } : undefined,
        tags: { path: req.path, method: req.method },
      })
    }
  }

  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error.'
    : (err.message || 'Internal server error.')

  res.status(status).json({ error: message })
}

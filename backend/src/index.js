import 'dotenv/config'
import * as Sentry from '@sentry/node'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'

import { logger } from './services/logger.js'
import { pool } from './config/db.js'
import { testRedisConnection } from './services/redis.js'

// Queues (imports register job processors)
import './queues/emailQueue.js'

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import contributionsRoutes from './routes/contributions.js'
import proposalsRoutes from './routes/proposals.js'
import donationsRoutes from './routes/donations.js'
import moderationRoutes from './routes/moderation.js'
import notificationsRoutes from './routes/notifications.js'
import topicsRoutes from './routes/topics.js'
import categoriesRoutes from './routes/categories.js'
import campaignsRoutes from './routes/campaigns.js'
import cmsProxyRoutes from './routes/cms-proxy.js'
import bannersRoutes from './routes/banners.js'
import emailTemplatesRoutes from './routes/email_templates.js'
import pagesRoutes from './routes/pages.js'
import settingsRoutes from './routes/settings.js'
import statsRoutes from './routes/stats.js'
import webhookRoutes from './routes/webhooks.js'
import errorHandler from './middleware/errorHandler.js'
import { registerLimiter, loginLimiter, forgotPasswordLimiter } from './middleware/rateLimiters.js'

// ── Sentry ────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  })
}

const app = express()

// FIX #4: must come before any middleware that reads req.ip.
// Without this, req.ip is the nginx container IP, breaking rate limiters
// and session IP logging when running behind a reverse proxy.
app.set('trust proxy', 1)

// ── HTTP request logging (Pino) ───────────────────────────────
app.use(pinoHttp({ logger }))

// ── Security headers (Helmet + detailed CSP) ─────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://js.stripe.com'],
      frameSrc:   ['https://js.stripe.com'],
      imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))

// ── CORS ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return cb(null, true)
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ── Parsing ───────────────────────────────────────────────────
app.use(cookieParser())
// Raw body for webhook signature verification (must come before express.json())
app.use('/api/donations/stripe/webhook', express.raw({ type: 'application/json' }))
app.use('/api/webhooks/strapi',          express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbOk = false
  try {
    await pool.query('SELECT 1')
    dbOk = true
  } catch { /* intentional */ }

  const cacheOk = await testRedisConnection()
  const status  = dbOk && cacheOk ? 'ok' : 'degraded'
  const httpStatus = status === 'ok' ? 200 : 503

  // FIX #11: never leak infra details publicly in production.
  // Uptime monitors only need the HTTP status code (200 vs 503).
  if (process.env.NODE_ENV === 'production') {
    return res.status(httpStatus).json({ status })
  }

  res.status(httpStatus).json({
    status,
    db:      dbOk    ? 'ok' : 'error',
    redis:   cacheOk ? 'ok' : 'error',
    version: process.env.npm_package_version || '1.0.0',
    uptime:  Math.floor(process.uptime()),
  })
})

// ── Routes ────────────────────────────────────────────────────
// Apply specific rate limiters to auth routes before the router
app.post('/api/auth/register',        registerLimiter)
app.post('/api/auth/login',           loginLimiter)
app.post('/api/auth/forgot-password', forgotPasswordLimiter)

app.use('/api/auth',           authRoutes)
app.use('/api/users',          usersRoutes)
app.use('/api/cms',            cmsProxyRoutes)
app.use('/api/topics',         topicsRoutes)
app.use('/api/categories',     categoriesRoutes)
app.use('/api/campaigns',      campaignsRoutes)
app.use('/api/banners',        bannersRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/pages',          pagesRoutes)
app.use('/api/settings',       settingsRoutes)
app.use('/api/stats',          statsRoutes)
app.use('/api/webhooks',       webhookRoutes)
app.use('/api',                contributionsRoutes)
app.use('/api/proposals',      proposalsRoutes)
app.use('/api/donations',      donationsRoutes)
app.use('/api/moderation',     moderationRoutes)
app.use('/api/notifications',  notificationsRoutes)

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

// ── Sentry error handler (must be before custom error handler) ─
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler())
}

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler)

// FIX #3: GOOGLE_CLIENT_ID must always be set — optional check was an auth bypass
if (!process.env.GOOGLE_CLIENT_ID) {
  logger.warn({ event: 'server.config_warning' }, 'GOOGLE_CLIENT_ID is not set — Google OAuth is disabled')
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  logger.info({ event: 'server.start', port: PORT, env: process.env.NODE_ENV }, 'Backend started')
})

export default app

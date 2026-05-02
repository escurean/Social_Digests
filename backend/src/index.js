import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

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
import errorHandler from './middleware/errorHandler.js'

const app = express()

// ── Security & logging ──────────────────────────────────────
app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── CORS ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return cb(null, true)
    // In development, allow any localhost port
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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api', limiter)

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/cms', cmsProxyRoutes)
app.use('/api/topics', topicsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/campaigns', campaignsRoutes)
app.use('/api/banners', bannersRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/pages', pagesRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api', contributionsRoutes)
app.use('/api/proposals', proposalsRoutes)
app.use('/api/donations', donationsRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/notifications', notificationsRoutes)

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})

export default app

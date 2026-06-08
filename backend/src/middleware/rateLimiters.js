import rateLimit from 'express-rate-limit'
import { redis } from '../services/redis.js'

// Redis store adapter for express-rate-limit
function redisStore(prefix) {
  return {
    async increment(key) {
      const rKey = `rl:${prefix}:${key}`
      const current = await redis.incr(rKey)
      if (current === 1) {
        // Set expiry only on first increment (avoids resetting window)
        const ttl = this.windowMs / 1000
        await redis.expire(rKey, ttl)
      }
      const ttl = await redis.ttl(rKey)
      return { totalHits: current, resetTime: new Date(Date.now() + ttl * 1000) }
    },
    async decrement(key) {
      await redis.decr(`rl:${prefix}:${key}`)
    },
    async resetKey(key) {
      await redis.del(`rl:${prefix}:${key}`)
    },
  }
}

function makeStore(prefix, windowMs) {
  const store = redisStore(prefix)
  store.windowMs = windowMs
  return store
}

const HOUR  = 60 * 60 * 1000
const MIN   = 60 * 1000
const DAY   = 24 * HOUR

export const registerLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  message: { error: 'Too many registration attempts. Try again in 1 hour.' },
  store: makeStore('register', HOUR),
  standardHeaders: true,
  legacyHeaders: false,
})

export const loginLimiter = rateLimit({
  windowMs: 15 * MIN,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  store: makeStore('login', 15 * MIN),
  standardHeaders: true,
  legacyHeaders: false,
})

export const forgotPasswordLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  message: { error: 'Too many password reset requests. Try again in 1 hour.' },
  store: makeStore('forgot', HOUR),
  standardHeaders: true,
  legacyHeaders: false,
})

export const contributionLimiter = rateLimit({
  windowMs: HOUR,
  max: 20,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many contributions. Try again in 1 hour.' },
  store: makeStore('contributions', HOUR),
  standardHeaders: true,
  legacyHeaders: false,
})

export const proposalLimiter = rateLimit({
  windowMs: DAY,
  max: 5,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many proposals. Try again tomorrow.' },
  store: makeStore('proposals', DAY),
  standardHeaders: true,
  legacyHeaders: false,
})

export const donationInitiateLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  message: { error: 'Too many donation attempts. Try again in 1 hour.' },
  store: makeStore('donations', HOUR),
  standardHeaders: true,
  legacyHeaders: false,
})

export const flagLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many flags submitted. Try again in 1 hour.' },
  store: makeStore('flags', HOUR),
  standardHeaders: true,
  legacyHeaders: false,
})

export const searchLimiter = rateLimit({
  windowMs: MIN,
  max: 30,
  message: { error: 'Too many search requests. Slow down.' },
  store: makeStore('search', MIN),
  standardHeaders: true,
  legacyHeaders: false,
})

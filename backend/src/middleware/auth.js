import jwt from 'jsonwebtoken'
import { logger } from '../services/logger.js'

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return req.cookies?.access_token || req.cookies?.token || null
}

export function authenticate(req, res, next) {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' })
    }
    next()
  }
}

export function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) { req.user = null; return next() }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    req.user = null
    // FIX #13: log suspicious tokens on optional-auth routes.
    // Expired tokens are expected (interceptor hasn't refreshed yet) — debug only.
    // Malformed or bad-signature tokens are suspicious — warn.
    if (err.name === 'TokenExpiredError') {
      logger.debug({ event: 'auth.token_expired_on_public_route', ip: req.ip }, 'Expired token on optional-auth route')
    } else {
      logger.warn({ event: 'auth.token_invalid_on_public_route', ip: req.ip, err: err.message }, 'Malformed or forged token on optional-auth route')
    }
  }
  next()
}

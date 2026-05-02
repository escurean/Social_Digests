import jwt from 'jsonwebtoken'

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return req.cookies?.token || null
}

export function authenticate(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }
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
  if (!token) {
    req.user = null
    return next()
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    req.user = null
  }
  next()
}

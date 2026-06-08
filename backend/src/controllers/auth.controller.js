import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { OAuth2Client } from 'google-auth-library'
import { query } from '../config/db.js'
import { redis } from '../services/redis.js'
import { emailQueue } from '../queues/emailQueue.js'
import { logger } from '../services/logger.js'
import { validatePasswordStrength } from '../utils/passwordStrength.js'

const ACCESS_TOKEN_TTL   = process.env.JWT_EXPIRES_IN             || '15m'
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10)
const MAX_LOGIN_ATTEMPTS = 10
const LOCKOUT_SECONDS    = 1800 // 30 minutes

// FIX #3: initialise once at module load; verifyIdToken is stateless
const googleClient = new OAuth2Client()

// FIX #8: explicit column list — never SELECT * on the users table
const USER_AUTH_COLS = 'id, name, email, role, password_hash, is_banned'

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

function setAccessCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
  })
}

function setRefreshCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  })
}

async function issueTokenPair(res, user, req) {
  const accessToken = signAccessToken(user)
  const refreshRaw  = uuidv4()
  const refreshHash = hashToken(refreshRaw)
  const expiresAt   = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

  await query(
    `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5::inet)`,
    [
      user.id,
      refreshHash,
      expiresAt,
      req?.headers?.['user-agent']?.slice(0, 255) || null,
      req?.ip || null,
    ]
  )

  setAccessCookie(res, accessToken)
  setRefreshCookie(res, refreshRaw)
  return { accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
}

// FIX #5: lockout key combines IP + email so an attacker from many IPs
// cannot lock a victim's account (each IP gets its own lockout bucket)
async function checkBruteForce(email, ip) {
  const key = `lockout:${ip}:${email.toLowerCase()}`
  const locked = await redis.get(key)
  return !!locked
}

async function recordFailedLogin(email, ip) {
  const attemptsKey = `login_attempts:${ip}:${email.toLowerCase()}`
  const attempts    = await redis.incr(attemptsKey)
  await redis.expire(attemptsKey, 3600)

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    await redis.setex(`lockout:${ip}:${email.toLowerCase()}`, LOCKOUT_SECONDS, '1')
    await redis.del(attemptsKey)
    logger.warn({ event: 'auth.lockout', email, ip }, 'Account locked after too many failed logins')
  }
}

async function clearLoginAttempts(email, ip) {
  await redis.del(`login_attempts:${ip}:${email.toLowerCase()}`)
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }

    // FIX #7: minimum 12 chars + zxcvbn weak-password check (ASVS 5.0 §2.1)
    const strength = validatePasswordStrength(password)
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error })
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const { rows: [user] } = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name.trim(), email.toLowerCase(), password_hash]
    )

    // FIX #9: queue email verification (non-blocking — never fail registration if email fails)
    Promise.resolve().then(async () => {
      try {
        const verifyToken = crypto.randomBytes(32).toString('hex')
        await redis.setex(`email_verify:${verifyToken}`, 86400, String(user.id))
        const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verifyToken}`
        await emailQueue.add('generic', {
          to: user.email,
          subject: 'Verify your email – Social Digests',
          html: `<p>Hi ${user.name},</p><p>Please verify your email address: <a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
      } catch (err) {
        logger.error({ event: 'email.verify_send_failed', userId: user.id, err: err.message }, 'Failed to queue verification email')
      }
    })

    logger.info({ event: 'auth.register', userId: user.id }, 'User registered')

    const payload = await issueTokenPair(res, user, req)
    res.status(201).json(payload)
  } catch (err) {
    next(err)
  }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Verification token is required.' })

    const userId = await redis.get(`email_verify:${token}`)
    if (!userId) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
    }

    await redis.del(`email_verify:${token}`)
    await query('UPDATE users SET email_verified = true WHERE id = $1', [userId])
    logger.info({ event: 'auth.email_verified', userId }, 'Email address verified')
    res.json({ message: 'Email verified successfully.' })
  } catch (err) {
    next(err)
  }
}

// ─── Resend Verification ──────────────────────────────────────────────────────

export async function resendVerification(req, res, next) {
  try {
    const cooldownKey = `resend_verify:${req.user.id}`
    const onCooldown  = await redis.get(cooldownKey)
    if (onCooldown) {
      return res.status(429).json({ error: 'Please wait before requesting another verification email.' })
    }
    await redis.setex(cooldownKey, 300, '1')

    const { rows: [user] } = await query(
      'SELECT id, name, email, email_verified FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!user) return res.status(404).json({ error: 'User not found.' })
    if (user.email_verified) return res.status(400).json({ error: 'Email is already verified.' })

    const verifyToken = crypto.randomBytes(32).toString('hex')
    await redis.setex(`email_verify:${verifyToken}`, 86400, String(user.id))
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verifyToken}`
    await emailQueue.add('generic', {
      to: user.email,
      subject: 'Verify your email – Social Digests',
      html: `<p>Hi ${user.name},</p><p>Please verify your email address: <a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
    }, { attempts: 3 })

    res.json({ message: 'Verification email sent.' })
  } catch (err) {
    next(err)
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    // FIX #5: pass IP so lockout is per-IP, not per-email
    const locked = await checkBruteForce(email, req.ip)
    if (locked) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 30 minutes.' })
    }

    // FIX #8: explicit columns — no SELECT *
    const { rows: [user] } = await query(
      `SELECT ${USER_AUTH_COLS} FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )
    if (!user) {
      await recordFailedLogin(email, req.ip)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await recordFailedLogin(email, req.ip)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    await clearLoginAttempts(email, req.ip)
    logger.info({ event: 'auth.login', userId: user.id }, 'User logged in')

    const payload = await issueTokenPair(res, user, req)
    res.json(payload)
  } catch (err) {
    next(err)
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refresh_token
    if (!rawToken) return res.status(401).json({ error: 'Refresh token required.' })

    const tokenHash = hashToken(rawToken)

    const { rows: [session] } = await query(
      `SELECT s.*, u.id AS uid, u.name, u.email, u.role, u.is_banned
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash]
    )

    if (!session) {
      // Token not found (or expired) — check if it was revoked (theft detection)
      const { rows: [revoked] } = await query(
        'SELECT user_id FROM sessions WHERE refresh_token_hash = $1 AND is_revoked = true',
        [tokenHash]
      )
      if (revoked) {
        await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [revoked.user_id])
        logger.error({ event: 'auth.token_theft', userId: revoked.user_id }, 'Token theft detected — all sessions revoked')
      }
      return res.status(401).json({ error: 'Invalid or expired refresh token.' })
    }

    if (session.is_revoked) {
      await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [session.user_id])
      logger.error({ event: 'auth.token_theft', userId: session.user_id }, 'Token theft detected — all sessions revoked')
      return res.status(401).json({ error: 'Session has been revoked.' })
    }

    if (session.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' })
    }

    // Rotate: invalidate old session, issue new pair
    await query('UPDATE sessions SET is_revoked = true WHERE id = $1', [session.id])

    const user = { id: session.uid, name: session.name, email: session.email, role: session.role }
    const payload = await issueTokenPair(res, user, req)
    res.json(payload)
  } catch (err) {
    next(err)
  }
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function me(req, res, next) {
  try {
    const { rows: [user] } = await query(
      'SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refresh_token
    if (rawToken) {
      const tokenHash = hashToken(rawToken)
      await query('UPDATE sessions SET is_revoked = true WHERE refresh_token_hash = $1', [tokenHash])
    }
    res.clearCookie('access_token')
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' })
    res.json({ message: 'Logged out.' })
  } catch (err) {
    next(err)
  }
}

// ─── Google OAuth — FIX #3 ───────────────────────────────────────────────────

export async function googleAuth(req, res, next) {
  try {
    const { credential } = req.body
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' })

    // FIX #3: GOOGLE_CLIENT_ID is required — fail explicitly rather than silently accepting any token
    if (!process.env.GOOGLE_CLIENT_ID) {
      logger.error({ event: 'auth.google_misconfigured' }, 'GOOGLE_CLIENT_ID env var is not set')
      return res.status(500).json({ error: 'OAuth is not configured. Contact support.' })
    }

    let googlePayload
    try {
      // google-auth-library validates signature, expiry, and audience in one call
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      googlePayload = ticket.getPayload()
    } catch (err) {
      logger.warn({ event: 'auth.google_token_invalid', ip: req.ip, err: err.message }, 'Google token verification failed')
      return res.status(401).json({ error: 'Invalid Google token.' })
    }

    // Belt-and-suspenders: explicit issuer check (google-auth-library checks this too)
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
    if (!validIssuers.includes(googlePayload.iss)) {
      logger.warn({ event: 'auth.google_issuer_mismatch', iss: googlePayload.iss, ip: req.ip }, 'Google token issuer mismatch')
      return res.status(401).json({ error: 'Token issuer mismatch.' })
    }

    if (!googlePayload.email_verified) {
      return res.status(401).json({ error: 'Google email is not verified.' })
    }

    const { email, name, sub: googleId, picture } = googlePayload
    let { rows: [user] } = await query(
      'SELECT id, name, email, role, google_id, avatar_url, is_banned FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (!user) {
      const { rows: [created] } = await query(
        `INSERT INTO users (name, email, google_id, avatar_url, password_hash, email_verified)
         VALUES ($1,$2,$3,$4,'', true) RETURNING id, name, email, role`,
        [name, email.toLowerCase(), googleId, picture || null]
      )
      user = created
      await emailQueue.add('welcome', { to: user.email, name: user.name }, { attempts: 3 })
    } else {
      if (!user.google_id) {
        await query(
          'UPDATE users SET google_id=$1, avatar_url=COALESCE(avatar_url,$2) WHERE id=$3',
          [googleId, picture || null, user.id]
        )
      }
      if (user.is_banned) return res.status(403).json({ error: 'Account is suspended.' })
    }

    const tokenPayload = await issueTokenPair(res, user, req)
    res.json(tokenPayload)
  } catch (err) {
    next(err)
  }
}

// ─── Forgot Password — FIX #10 ───────────────────────────────────────────────

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    const normalizedEmail = email?.toLowerCase().trim()

    // Always return 200 — never reveal whether an email is registered
    if (!normalizedEmail) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' })
    }

    const { rows: [user] } = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (user) {
      const cooldownKey = `pwd_reset_cooldown:${user.id}`
      const onCooldown  = await redis.get(cooldownKey)

      if (!onCooldown) {
        await redis.setex(cooldownKey, 300, '1')

        const token     = crypto.randomBytes(32).toString('hex')
        const tokenHash = hashToken(token)
        await redis.setex(`pwd_reset:${tokenHash}`, 3600, String(user.id))

        const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`
        await emailQueue.add('generic', {
          to: normalizedEmail,
          subject: 'Reset your password – Social Digests',
          html: `<p>Hi ${user.name},</p><p>Click to reset your password: <a href="${resetUrl}">Reset my password</a></p><p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })

        logger.info({ event: 'auth.forgot_password', userId: user.id }, 'Password reset link queued')
      }
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
}

// ─── Reset Password — FIX #10 ────────────────────────────────────────────────

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' })
    }

    // FIX #7: enforce strength on the new password too
    const strength = validatePasswordStrength(password)
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error })
    }

    const tokenHash = hashToken(token)
    const userId    = await redis.get(`pwd_reset:${tokenHash}`)

    if (!userId) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId])

    // Revoke all sessions — force re-login on all devices after password change
    await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [userId])

    // Consume the token (single-use)
    await redis.del(`pwd_reset:${tokenHash}`)

    logger.info({ event: 'auth.password_reset', userId }, 'Password reset completed')
    res.json({ message: 'Password reset successfully. Please log in with your new password.' })
  } catch (err) {
    next(err)
  }
}

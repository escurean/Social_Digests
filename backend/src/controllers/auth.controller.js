import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const result = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
      [name.trim(), email.toLowerCase(), password_hash]
    )
    const user = result.rows[0]
    const token = signToken(user)
    setTokenCookie(res, token)

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = signToken(user)
    setTokenCookie(res, token)

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token })
  } catch (err) {
    next(err)
  }
}

export async function me(req, res, next) {
  try {
    const result = await query(
      'SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'User not found.' })
    res.json({ user: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res) {
  res.clearCookie('token')
  res.json({ message: 'Logged out.' })
}

export async function googleAuth(req, res, next) {
  try {
    const { credential } = req.body
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' })

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!verifyRes.ok) return res.status(401).json({ error: 'Invalid Google token.' })
    const payload = await verifyRes.json()

    if (payload.error_description) return res.status(401).json({ error: payload.error_description })

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (clientId && payload.aud !== clientId) {
      return res.status(401).json({ error: 'Token audience mismatch.' })
    }
    if (payload.email_verified !== 'true') {
      return res.status(401).json({ error: 'Google email is not verified.' })
    }

    const { email, name, sub: googleId, picture } = payload

    let { rows: [user] } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])

    if (!user) {
      const { rows: [created] } = await query(
        `INSERT INTO users (name, email, google_id, avatar_url) VALUES ($1,$2,$3,$4)
         RETURNING id, name, email, role`,
        [name, email.toLowerCase(), googleId, picture || null]
      )
      user = created
    } else {
      if (!user.google_id) {
        await query(
          'UPDATE users SET google_id=$1, avatar_url=COALESCE(avatar_url,$2) WHERE id=$3',
          [googleId, picture || null, user.id]
        )
      }
      if (user.is_banned) return res.status(403).json({ error: 'Account is suspended.' })
    }

    const token = signToken(user)
    setTokenCookie(res, token)
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token })
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req, res) {
  res.status(501).json({ message: 'Not yet implemented', endpoint: 'POST /api/auth/forgot-password' })
}

export async function resetPassword(req, res) {
  res.status(501).json({ message: 'Not yet implemented', endpoint: 'POST /api/auth/reset-password' })
}

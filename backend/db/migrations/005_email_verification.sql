-- Email verification and password reset audit support

-- Add email verification flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Google-created accounts are pre-verified (backfill)
UPDATE users SET email_verified = true WHERE google_id IS NOT NULL AND email_verified = false;

CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users (email_verified) WHERE email_verified = false;

-- Password reset audit log
CREATE TABLE IF NOT EXISTS password_reset_log (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  ip_address    INET
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_log_user ON password_reset_log (user_id, requested_at DESC);

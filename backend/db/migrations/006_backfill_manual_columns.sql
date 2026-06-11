-- Backfill columns that were added manually to production.
-- Uses ADD COLUMN IF NOT EXISTS so this is safe on both existing and fresh DBs.

-- Sessions: columns added manually after initial deploy
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent        TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address        INET;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info       TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at      TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- token_hash was NOT NULL in the original schema but some DBs were created
-- without it; make it nullable so both old and new sessions rows are valid.
ALTER TABLE sessions ALTER COLUMN token_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions (refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Donations: gateway_reference (pre-existing DBs may have been created without it)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS gateway_reference  VARCHAR(255);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS idempotency_key    VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_idempotency
  ON donations (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_gateway
  ON donations (gateway_reference) WHERE gateway_reference IS NOT NULL;

-- Refresh tokens table (standalone, for future token management)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(255) NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  is_revoked        BOOLEAN NOT NULL DEFAULT false,
  user_agent        TEXT,
  ip_address        INET,
  gateway_reference VARCHAR(255),
  payment_method    TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);

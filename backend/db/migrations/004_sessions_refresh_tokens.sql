-- Add refresh token support to sessions table
-- Sessions now store hashed refresh tokens (opaque UUIDs) with rotation tracking.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address INET;

-- Keep existing token_hash for backwards compat but make it nullable
ALTER TABLE sessions ALTER COLUMN token_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions (refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions (user_id);

-- Add idempotency key support to donations
ALTER TABLE donations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_idempotency ON donations (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add gateway index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_donations_gateway ON donations (gateway_reference) WHERE gateway_reference IS NOT NULL;

-- Full-text search index on contributions
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(body, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_contributions_fts ON contributions USING GIN (search_vector);

-- Cursor pagination index for topic threads
CREATE INDEX IF NOT EXISTS idx_contributions_topic_created
  ON contributions (topic_slug, created_at DESC, id DESC)
  WHERE is_removed = false;

-- Replies index
CREATE INDEX IF NOT EXISTS idx_contributions_parent ON contributions (parent_id) WHERE parent_id IS NOT NULL;

-- Unread notifications per user
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- Add google_id column to users if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;

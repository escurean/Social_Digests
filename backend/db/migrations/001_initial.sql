-- Social Digests — initial schema
-- Run once against the PostgreSQL database (Express-managed tables)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'org', 'admin')),
  avatar_url    TEXT,
  bio           TEXT,
  is_banned     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash        VARCHAR(255),
  refresh_token_hash VARCHAR(255),
  is_revoked        BOOLEAN NOT NULL DEFAULT false,
  expires_at        TIMESTAMPTZ NOT NULL,
  user_agent        TEXT,
  ip_address        INET,
  device_info       TEXT,
  gateway_reference VARCHAR(255),
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contributions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributions (
  id               SERIAL PRIMARY KEY,
  topic_slug       VARCHAR(255) NOT NULL,
  user_id          INTEGER REFERENCES users (id) ON DELETE SET NULL,
  body             TEXT NOT NULL,
  parent_id        INTEGER REFERENCES contributions (id) ON DELETE CASCADE,
  reaction_count   INTEGER NOT NULL DEFAULT 0,
  is_removed       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_topic_slug ON contributions (topic_slug);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id    ON contributions (user_id);

-- ── Contribution reactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS contribution_reactions (
  id               SERIAL PRIMARY KEY,
  contribution_id  INTEGER NOT NULL REFERENCES contributions (id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL DEFAULT 'upvote',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contribution_id, user_id)
);

-- ── Flags ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flags (
  id               SERIAL PRIMARY KEY,
  contribution_id  INTEGER NOT NULL REFERENCES contributions (id) ON DELETE CASCADE,
  reporter_id      INTEGER REFERENCES users (id) ON DELETE SET NULL,
  reason           TEXT,
  status           VARCHAR(50) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'dismissed', 'actioned')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Moderation actions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_actions (
  id              SERIAL PRIMARY KEY,
  admin_id        INTEGER REFERENCES users (id),
  target_user_id  INTEGER REFERENCES users (id),
  flag_id         INTEGER REFERENCES flags (id),
  action_type     VARCHAR(50),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Topic proposals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_proposals (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users (id) ON DELETE SET NULL,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  category_slug    VARCHAR(255),
  status           VARCHAR(50) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by      INTEGER REFERENCES users (id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Donations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users (id) ON DELETE SET NULL,
  campaign_id        INTEGER NOT NULL,
  amount             DECIMAL(12, 2) NOT NULL,
  currency           VARCHAR(10) NOT NULL DEFAULT 'KES',
  method             VARCHAR(50) CHECK (method IN ('stripe', 'mpesa')),
  gateway_reference  VARCHAR(255),
  status             VARCHAR(50) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        VARCHAR(100) NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, is_read);

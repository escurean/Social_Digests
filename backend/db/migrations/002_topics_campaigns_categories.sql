-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (slug, name, description) VALUES
  ('water',          'Water & Sanitation', 'Clean water access and sanitation infrastructure'),
  ('education',      'Education',          'Schools, teachers, and learning resources'),
  ('health',         'Health',             'Healthcare access and community health'),
  ('environment',    'Environment',        'Climate, conservation, and urban green spaces'),
  ('governance',     'Governance',         'Accountability, policy, and civic participation'),
  ('infrastructure', 'Infrastructure',     'Roads, power, and public facilities')
ON CONFLICT (slug) DO NOTHING;

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  context          TEXT,
  category_slug    TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','draft')),
  is_featured      BOOLEAN DEFAULT false,
  contribution_count INT DEFAULT 0,
  created_by       INT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_status   ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category_slug);
CREATE INDEX IF NOT EXISTS idx_topics_featured ON topics(is_featured);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  goal_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  raised_amount    NUMERIC(15,2) DEFAULT 0,
  currency         TEXT DEFAULT 'KES',
  deadline         TIMESTAMPTZ,
  beneficiary_name TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','draft')),
  topic_slug       TEXT REFERENCES topics(slug) ON DELETE SET NULL,
  created_by       INT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_topic  ON campaigns(topic_slug);


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
  goal_amount      BIGINT NOT NULL DEFAULT 0,
  raised_amount    BIGINT DEFAULT 0,
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

-- Seed topics
INSERT INTO topics (slug, title, context, category_slug, status, is_featured, contribution_count) VALUES
  ('water-nairobi-informal',
   'Water access in Nairobi informal settlements',
   'Residents of Mathare, Kibera, and Korogocho rely on expensive kiosks and unsafe sources. This topic explores policy and community solutions for equitable water access.',
   'water', 'active', true, 142),
  ('teacher-shortages-rural',
   'Teacher shortages in rural schools',
   'Many county schools in Turkana, Marsabit, and Mandera lack qualified teachers. How can government and communities address this persistent gap?',
   'education', 'active', true, 87),
  ('boda-boda-safety',
   'Boda boda safety and regulation',
   'Motorcycle taxis account for a growing share of road fatalities. What licensing, infrastructure, and cultural changes can make them safer?',
   'governance', 'active', false, 54)
ON CONFLICT (slug) DO NOTHING;

-- Seed campaign
INSERT INTO campaigns (slug, title, description, goal_amount, raised_amount, currency, deadline, beneficiary_name, status, topic_slug) VALUES
  ('borehole-mathare-south',
   'Borehole for Mathare South',
   'Residents of Mathare South have relied on expensive water kiosks for years. This campaign will fund the drilling and casing of a community borehole that will serve approximately 3,000 households with clean, affordable water.',
   800000, 504000, 'KES',
   NOW() + INTERVAL '45 days',
   'Mathare South Community', 'active', 'water-nairobi-informal')
ON CONFLICT (slug) DO NOTHING;

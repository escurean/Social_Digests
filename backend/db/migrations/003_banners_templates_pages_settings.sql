-- Banners
CREATE TABLE IF NOT EXISTS banners (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  is_active  BOOLEAN DEFAULT false,
  starts_at  DATE,
  ends_at    DATE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO banners (title, body, is_active) VALUES
  ('Welcome to Social Digests', 'Join thousands of community members discussing the issues that matter.', true),
  ('Propose your own topics', 'Community members can now suggest discussion topics directly.', false)
ON CONFLICT DO NOTHING;

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  subject     TEXT NOT NULL DEFAULT '',
  body_html   TEXT NOT NULL DEFAULT '',
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  updated_by  INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_key_idx ON email_templates(key);

INSERT INTO email_templates (key, subject, description, is_active) VALUES
  ('welcome',               'Welcome to Social Digests, {{user_name}}!',       'Sent on registration',                       true),
  ('topic_reply',           'Someone replied to your contribution',             'Sent when a user replies to a contribution', true),
  ('proposal_approved',     'Your topic proposal was approved',                 'Sent when admin approves a topic proposal',  true),
  ('proposal_rejected',     'Update on your topic proposal',                    'Sent when admin rejects a topic proposal',   true),
  ('donation_receipt',      'Thank you for your donation — {{campaign_title}}', 'Sent after a successful donation',           true),
  ('campaign_goal_reached', 'Campaign goal reached!',                           'Sent to donors when campaign hits goal',     false)
ON CONFLICT (key) DO NOTHING;

-- Static pages
CREATE TABLE IF NOT EXISTS static_pages (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT '',
  show_in_footer   BOOLEAN DEFAULT false,
  show_in_header   BOOLEAN DEFAULT false,
  meta_title       VARCHAR(255),
  meta_description TEXT,
  is_published     BOOLEAN DEFAULT true,
  created_by       INT REFERENCES users(id) ON DELETE SET NULL,
  updated_by       INT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS static_pages_slug_idx ON static_pages(slug);

INSERT INTO static_pages (slug, title, content, show_in_footer) VALUES
  ('about-us', 'About us',
   '## About Social Digests

Social Digests is a community platform built for meaningful conversations about the issues that matter — from water access in informal settlements to teacher shortages in rural schools.

We believe change starts with dialogue.',
   true),
  ('community-guidelines', 'Community guidelines',
   '## Community Guidelines

We expect all members to engage respectfully and constructively. Personal attacks, misinformation, and spam will be removed.

- Be respectful of different perspectives
- Cite sources when making factual claims
- Stay on topic
- No hate speech or harassment',
   true),
  ('privacy-policy', 'Privacy policy',
   '## Privacy Policy

We are committed to protecting your personal data. We collect only what is necessary to provide the service and never sell your information to third parties.',
   true),
  ('terms-of-use', 'Terms of use',
   '## Terms of Use

By using Social Digests, you agree to these terms. You must be 18 or older to use this platform. You are responsible for the content you post.',
   true),
  ('faq', 'FAQ',
   '## Frequently Asked Questions

**Q: How do I propose a topic?**
A: Click "Propose a topic" while logged in as a registered member.

**Q: How are donations processed?**
A: We use M-Pesa and Stripe for secure payment processing.

**Q: How do I report inappropriate content?**
A: Use the flag button on any contribution.',
   false)
ON CONFLICT (slug) DO NOTHING;

-- Site settings (enforced single row)
CREATE TABLE IF NOT EXISTS site_settings (
  id            INT PRIMARY KEY DEFAULT 1,
  platform_name TEXT NOT NULL DEFAULT 'Social Digests',
  tagline       TEXT DEFAULT 'Conversations that move communities.',
  primary_color TEXT DEFAULT '#C04000',
  support_email TEXT DEFAULT 'support@socialdigests.com',
  footer_text   TEXT DEFAULT '© 2026 Social Digests. All rights reserved.',
  logo_url      TEXT,
  updated_by    INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

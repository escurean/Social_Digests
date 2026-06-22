-- category_slug was added to 001_initial.sql after the initial production deploy,
-- so existing DBs need it backfilled here.
ALTER TABLE topic_proposals
  ADD COLUMN IF NOT EXISTS category_slug VARCHAR(255);

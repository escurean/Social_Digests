-- Public content is now served from Postgres (Express) instead of Strapi.
-- Store what the UI needs that previously only existed in Strapi.

ALTER TABLE topics    ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS beneficiary_details TEXT;

-- Align status vocabularies with Strapi (previously the webhook sync failed
-- for these values because of the CHECK constraints).
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft','active','closed','goal_reached','expired','completed'));

ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_status_check;
ALTER TABLE topics ADD CONSTRAINT topics_status_check
  CHECK (status IN ('draft','active','closed','archived'));

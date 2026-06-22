-- email_templates.updated_by was present in migration 003 but the table was
-- created manually on production before that migration ran, so the column was
-- never applied. ADD COLUMN IF NOT EXISTS is a no-op on fresh DBs where 003
-- ran correctly.
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id) ON DELETE SET NULL;

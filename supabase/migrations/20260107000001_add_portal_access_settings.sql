-- Add portal access settings to projects table
-- Enables public/restricted access modes with optional password protection

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'restricted'
    CHECK (access_mode IN ('public', 'restricted')),
  ADD COLUMN IF NOT EXISTS access_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS require_email_for_analytics BOOLEAN DEFAULT false;

-- Add index for faster access mode lookups
CREATE INDEX IF NOT EXISTS idx_projects_access_mode ON projects(access_mode);

COMMENT ON COLUMN projects.access_mode IS 'Portal access mode: public (anyone with link) or restricted (approved emails only)';
COMMENT ON COLUMN projects.access_password_hash IS 'Bcrypt hash of optional portal password';
COMMENT ON COLUMN projects.require_email_for_analytics IS 'Whether to collect visitor email for analytics in public mode';


-- Add branding columns to organizations and projects
-- This enables custom logo and brand color for white-labeling

-- Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_path TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color TEXT;

-- Projects (can override organization branding)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_path TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_color TEXT;

-- Add helpful comments
COMMENT ON COLUMN organizations.logo_path IS 'Path to logo in Supabase Storage (branding bucket)';
COMMENT ON COLUMN organizations.brand_color IS 'Primary brand color as hex value (e.g. #6366f1)';
COMMENT ON COLUMN projects.logo_path IS 'Project-specific logo path (overrides organization logo if set)';
COMMENT ON COLUMN projects.brand_color IS 'Project-specific brand color (overrides organization color if set)';

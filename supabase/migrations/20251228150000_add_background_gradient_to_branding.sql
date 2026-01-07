-- Add background_gradient column to organizations and projects
-- Follows same pattern as brand_color and logo_path (project overrides org)

-- Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS background_gradient TEXT;

-- Projects (can override organization gradient)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS background_gradient TEXT;

-- Add helpful comments
COMMENT ON COLUMN organizations.background_gradient IS 'Preset gradient identifier (e.g. "sunset", "ocean") for portal background';
COMMENT ON COLUMN projects.background_gradient IS 'Project-specific gradient (overrides organization gradient if set)';

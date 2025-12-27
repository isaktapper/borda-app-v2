-- Add engagement score columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS engagement_score INTEGER,
ADD COLUMN IF NOT EXISTS engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low', 'none')),
ADD COLUMN IF NOT EXISTS engagement_calculated_at TIMESTAMPTZ;

-- Add index for filtering by engagement level
CREATE INDEX IF NOT EXISTS idx_projects_engagement_level ON projects(engagement_level);

-- Add index for sorting by engagement score
CREATE INDEX IF NOT EXISTS idx_projects_engagement_score ON projects(engagement_score DESC);

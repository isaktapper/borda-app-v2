-- Update project status constraint to include all 4 statuses
-- and set default to 'draft'

-- Drop existing constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new constraint with all 4 statuses
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'completed', 'archived'));

-- Set default to 'draft' for new projects
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'draft';

-- Optional: Update existing NULL statuses to 'active' (if any)
UPDATE projects SET status = 'active' WHERE status IS NULL;

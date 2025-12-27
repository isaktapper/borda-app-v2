-- Refresh projects_with_assigned view to include engagement columns
-- This is needed because the view was created before engagement columns were added

-- Drop the existing view first
DROP VIEW IF EXISTS projects_with_assigned;

-- Recreate with all current columns (including engagement_score, engagement_level, etc.)
CREATE VIEW projects_with_assigned AS
SELECT
  p.*,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'avatar_url', u.avatar_url
  ) as assigned_user
FROM projects p
LEFT JOIN users u ON p.assigned_to = u.id;

-- Enable security_invoker so the view runs with the privileges of the user calling it
-- This means RLS policies from the underlying tables (projects, users) will be enforced
ALTER VIEW projects_with_assigned SET (security_invoker = true);

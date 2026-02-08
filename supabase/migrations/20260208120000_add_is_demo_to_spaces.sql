-- Add is_demo column to spaces table
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Recreate the spaces_with_assigned view to include is_demo,
-- show_borda_branding, and background_gradient (which were added after the view)
DROP VIEW IF EXISTS spaces_with_assigned;

CREATE VIEW spaces_with_assigned AS
SELECT
  s.id,
  s.organization_id,
  s.name,
  s.client_name,
  s.client_logo_url,
  s.status,
  s.target_go_live_date,
  s.created_by,
  s.created_at,
  s.updated_at,
  s.deleted_at,
  s.assigned_to,
  s.logo_path,
  s.brand_color,
  s.template_id,
  s.engagement_score,
  s.engagement_level,
  s.engagement_calculated_at,
  s.engagement_factors,
  s.show_borda_branding,
  s.background_gradient,
  s.is_demo,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'avatar_url', u.avatar_url
  ) AS assigned_user
FROM spaces s
LEFT JOIN users u ON s.assigned_to = u.id;

ALTER VIEW spaces_with_assigned SET (security_invoker = true);

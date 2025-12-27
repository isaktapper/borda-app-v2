-- Update projects_with_assigned view to include avatar_url

-- Drop the existing view first
drop view if exists projects_with_assigned;

-- Recreate with avatar_url included
create view projects_with_assigned as
select
  p.*,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'avatar_url', u.avatar_url
  ) as assigned_user
from projects p
left join users u on p.assigned_to = u.id;

-- Enable security_invoker so the view runs with the privileges of the user calling it
-- This means RLS policies from the underlying tables (projects, users) will be enforced
alter view projects_with_assigned set (security_invoker = true);

-- Create a view that combines projects with assigned user information
-- This view makes it easier to fetch project data with user details

create or replace view projects_with_assigned as
select
  p.*,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name
  ) as assigned_user
from projects p
left join users u on p.assigned_to = u.id;

-- Enable security_invoker so the view runs with the privileges of the user calling it
-- This means RLS policies from the underlying tables (projects, users) will be enforced
alter view projects_with_assigned set (security_invoker = true);

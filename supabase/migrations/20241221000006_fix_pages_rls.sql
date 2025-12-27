-- Fix Pages RLS Recursion and Permissions

-- 1. Drop existing management policy
drop policy if exists "Project owners can manage pages" on pages;

-- 2. New policy: Anyone in the organization can manage pages
-- This uses the same logic as the projects table RLS
create policy "Organization members can manage pages"
  on pages for all
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  )
  with check (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

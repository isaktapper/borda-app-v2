-- Fix Project Members RLS Recursion

-- 1. Helper function to check project ownership without recursion
create or replace function public.is_project_owner(p_project_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members 
    where project_id = p_project_id 
    and user_id = auth.uid() 
    and role = 'owner'
    and deleted_at is null
  );
$$;

-- 2. Update Project Members Policies

-- View: Users can see members of projects they are in
-- OR members of any project in their organization (simpler check)
drop policy if exists "Users can view project members" on project_members;
create policy "Users can view project members"
  on project_members for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

-- All: Owners can manage member
drop policy if exists "Owners can manage project members" on project_members;
create policy "Owners can manage project members"
  on project_members for all
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));

-- Insert: Allow users to add themselves as owner during project creation
-- This is needed because during creation, is_project_owner will be false until the record is inserted.
drop policy if exists "Users can add memberships during creation" on project_members;
create policy "Users can add memberships during creation"
  on project_members for insert
  with check (
    user_id = auth.uid()
    and
    (
      -- Either the project doesn't have an owner yet (creation flow)
      not exists (
        select 1 from project_members pm 
        where pm.project_id = project_members.project_id 
        and pm.role = 'owner'
      )
      or
      -- Or the user is an owner (adding others)
      is_project_owner(project_id)
    )
  );

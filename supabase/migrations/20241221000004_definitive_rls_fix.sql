-- Definitive Fix for Project Members RLS Recursion

-- 1. Helper function to check if a project has an owner
create or replace function public.project_has_owner(p_project_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members 
    where project_id = p_project_id 
    and role = 'owner'
    and deleted_at is null
  );
$$;

-- 2. Helper function to check project ownership (already exists, but rewarding for clarity)
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

-- 3. Drop existing policies to start fresh
drop policy if exists "Users can view project members" on project_members;
drop policy if exists "Owners can manage project members" on project_members;
drop policy if exists "Users can add memberships during creation" on project_members;
drop policy if exists "Users can add themselves as owner of their projects" on project_members;

-- 4. New Non-Recursive Policies

-- SELECT: Users can see members of projects in their organization
-- (This check is safe as it queries 'projects', not 'project_members')
create policy "Users can view project members"
  on project_members for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

-- INSERT: Allow adding members
create policy "Allow project member insertion"
  on project_members for insert
  with check (
    -- Case A: Adding yourself as owner to a project you just created
    (
      user_id = auth.uid() 
      and role = 'owner'
      and not project_has_owner(project_id)
      and exists (
        select 1 from projects 
        where id = project_id and created_by = auth.uid()
      )
    )
    or
    -- Case B: Existing owner adding/inviting someone else
    is_project_owner(project_id)
  );

-- UPDATE/DELETE: Only owners can manage
create policy "Owners can update members"
  on project_members for update
  using (is_project_owner(project_id));

create policy "Owners can delete members"
  on project_members for delete
  using (is_project_owner(project_id));

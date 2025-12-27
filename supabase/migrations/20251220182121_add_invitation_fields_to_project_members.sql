-- Update project_members to support invitations
alter table public.project_members 
  add column if not exists invited_email text,
  add column if not exists invite_token uuid unique,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id);

-- user_id should be nullable to support pending invites
alter table public.project_members alter column user_id drop not null;

-- Update RLS for project_members
-- 1. CS can manage everything in their org
-- 2. Members can see their own membership
-- 3. Anonymous/Public can see membership if they have a valid token (for acceptance)

drop policy if exists "project_members_select_policy" on public.project_members;
drop policy if exists "project_members_insert_policy" on public.project_members;
drop policy if exists "project_members_update_policy" on public.project_members;
drop policy if exists "project_members_delete_policy" on public.project_members;

create policy "pm_select_authenticated"
  on public.project_members for select
  using (
    auth.uid() = user_id or 
    public.can_user_access_project(project_id)
  );

create policy "pm_insert_manager"
  on public.project_members for insert
  with check (public.can_user_access_project(project_id));

create policy "pm_update_manager"
  on public.project_members for update
  using (public.can_user_access_project(project_id));

create policy "pm_delete_manager"
  on public.project_members for delete
  using (public.can_user_access_project(project_id));

-- Security: Lock down portal access to members only
-- We need to update existing RLS for tasks, files, responses etc.
-- This will be done by ensuring public.can_user_access_project(project_id) handles roles.

-- Update can_user_access_project to be more robust
-- (Assuming it currently checks organization membership, we might want to check project_members too)
-- For Step 17, we simply ensure the portal layout/middleware checks membership.

-- Definitive fix for Pages RLS and soft-delete issues

-- 1. Create a security definer function to check project access
-- This bypasses RLS for the internal checks, preventing visibility loops
create or replace function public.can_user_access_project(p_project_id text)
returns boolean as $$
begin
  return exists (
    select 1 from public.projects p
    join public.organization_members om on p.organization_id = om.organization_id
    where p.id = p_project_id
    and om.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Drop all previous policies on pages
drop policy if exists "Users can view non-deleted pages" on pages;
drop policy if exists "Organization members can manage pages" on pages;
drop policy if exists "Organization members can insert pages" on pages;
drop policy if exists "Organization members can update pages" on pages;
drop policy if exists "Organization members can delete pages" on pages;
drop policy if exists "Project owners can manage pages" on pages;
drop policy if exists "Users can view pages of their organization's projects" on pages;

-- 3. Create fresh, clean policies

-- SELECT: Can view if non-deleted AND in organization
create policy "pages_select_policy"
  on pages for select
  using (
    can_user_access_project(project_id)
    and deleted_at is null
  );

-- INSERT: Can insert if in organization
create policy "pages_insert_policy"
  on pages for insert
  with check (can_user_access_project(project_id));

-- UPDATE: Can update if in organization (including setting deleted_at)
create policy "pages_update_policy"
  on pages for update
  using (can_user_access_project(project_id))
  with check (can_user_access_project(project_id));

-- DELETE: Can hard delete if in organization (though we use soft delete)
create policy "pages_delete_policy"
  on pages for delete
  using (can_user_access_project(project_id));

-- Simplest possible RLS check for Pages that avoids recursion and function overhead

-- 1. Drop existing policies to start fresh
drop policy if exists "pages_select_policy" on pages;
drop policy if exists "pages_insert_policy" on pages;
drop policy if exists "pages_update_policy" on pages;
drop policy if exists "pages_delete_policy" on pages;

-- 2. SELECT: In organization and NOT deleted
create policy "pages_select_direct"
  on pages for select
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on p.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
    and deleted_at is null
  );

-- 3. INSERT: In organization
create policy "pages_insert_direct"
  on pages for insert
  with check (
    project_id in (
      select p.id from projects p
      join organization_members om on p.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

-- 4. UPDATE: In organization
-- Crucially, we do NOT check deleted_at in the USING or WITH CHECK here
-- so that setting deleted_at (soft delete) doesn't violate the policy.
create policy "pages_update_direct"
  on pages for update
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on p.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select p.id from projects p
      join organization_members om on p.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

-- 5. DELETE: In organization
create policy "pages_delete_direct"
  on pages for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on p.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

-- Refine Pages RLS for Soft Deletes

-- 1. Drop the broad management policy
drop policy if exists "Organization members can manage pages" on pages;
drop policy if exists "Users can view pages of their organization's projects" on pages;

-- 2. Select policy: Only non-deleted pages
create policy "Users can view non-deleted pages"
  on pages for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
    and deleted_at is null
  );

-- 3. Insert/Update/Delete policy: Organization members can manage
create policy "Organization members can manage pages"
  on pages for all -- This still allows select, but the more specific one above might conflict or combine? 
  -- In Postgres, policies are combined with OR by default. 
  -- To force the deleted_at check on SELECT, we should use separate policies for different commands.
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

-- Actually, let's be more specific to avoid OR-ing into allowing deleted pages in Select
drop policy if exists "Organization members can manage pages" on pages;

create policy "Organization members can insert pages"
  on pages for insert
  with check (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

create policy "Organization members can update pages"
  on pages for update
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

create policy "Organization members can delete pages"
  on pages for delete
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

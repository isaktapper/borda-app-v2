-- Allow users to view other users in their organization
-- This is needed for joins like projects.assigned_to -> users

create policy "Users can view members in their organizations"
  on users for select
  using (
    exists (
      select 1 from organization_members om1
      where om1.user_id = users.id
      and om1.deleted_at is null
      and om1.organization_id in (
        select om2.organization_id
        from organization_members om2
        where om2.user_id = auth.uid()
        and om2.deleted_at is null
      )
    )
  );

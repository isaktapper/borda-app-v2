-- Drop old restrictive INSERT policy
drop policy if exists "Users can join organizations" on public.organization_members;

-- Create helper function to check if user is org admin/owner
create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and deleted_at is null
  );
$$;

-- Allow users to insert themselves OR admins/owners to invite others
create policy "Users can join or be invited to organizations"
  on public.organization_members
  for insert
  with check (
    -- User can add themselves
    (auth.uid() = user_id)
    or
    -- OR an admin/owner can invite others to their org
    (public.is_org_admin(organization_id))
  );

-- Allow admins/owners to update member roles
create policy "Admins can update organization members"
  on public.organization_members
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Allow admins/owners to soft-delete members
create policy "Admins can delete organization members"
  on public.organization_members
  for delete
  using (public.is_org_admin(organization_id));

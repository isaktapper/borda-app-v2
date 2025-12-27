-- Fix RLS Infinite Recursion and Add Insert Policies

-- 1. Helper Function to bypass RLS for org checks
create or replace function public.get_user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from organization_members where user_id = auth.uid();
$$;

-- 2. Update Organizations Policies

-- Drop existing select policy
drop policy if exists "Users can view organizations they belong to" on organizations;

-- Re-create select policy using the helper
create policy "Users can view organizations they belong to"
  on organizations for select
  using (
    id in (select get_user_org_ids())
  );

-- Add INSERT policy (authenticated users can create orgs)
create policy "Users can create organizations"
  on organizations for insert
  with check (auth.role() = 'authenticated');

-- 3. Update Organization Members Policies

-- Drop existing select policy
drop policy if exists "Users can view members of their organizations" on organization_members;

-- Re-create select policy using the helper
-- Users can see memberships if they are the user OR if they are in the same org
create policy "Users can view members of their organizations"
  on organization_members for select
  using (
    user_id = auth.uid() 
    or 
    organization_id in (select get_user_org_ids())
  );

-- Add INSERT policy
-- Users can insert themselves as members (when joining or creating)
-- OR owners/admins can add others (logic logic later, for now cover the creation flow)
-- For onboarding flow: user adds THEMSELVES.
create policy "Users can join organizations"
  on organization_members for insert
  with check (
    auth.uid() = user_id -- Only allow adding YOURSELF. 
    -- We might need to relax this later for invites, but for now this covers onboarding.
  );

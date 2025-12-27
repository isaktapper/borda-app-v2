-- Fix responses table to support both authenticated users and portal customers
-- Issue: Portal customers don't have user_id (not in auth.users), only email

-- 1. Drop existing constraint
alter table public.responses
  drop constraint if exists unique_response_per_user;

-- 2. Make user_id nullable (for portal customers)
alter table public.responses
  alter column user_id drop not null;

-- 3. Add customer_email column for portal customers
alter table public.responses
  add column if not exists customer_email text;

-- 4. Add new constraints
-- Either user_id OR customer_email must be present
alter table public.responses
  add constraint user_or_customer_required
  check (
    (user_id is not null and customer_email is null) or
    (user_id is null and customer_email is not null)
  );

-- 5. Unique constraint: one response per block per user OR per customer
-- We need two separate unique constraints since we can't combine nullable columns properly
create unique index if not exists unique_response_per_authenticated_user
  on public.responses(block_id, user_id)
  where user_id is not null;

create unique index if not exists unique_response_per_customer
  on public.responses(block_id, customer_email)
  where customer_email is not null;

-- 6. Add index on customer_email
create index if not exists idx_responses_customer_email
  on public.responses(customer_email)
  where customer_email is not null;

-- 7. Update RLS policies to handle both user types
drop policy if exists "responses_select_policy" on public.responses;
drop policy if exists "responses_insert_policy" on public.responses;
drop policy if exists "responses_update_policy" on public.responses;
drop policy if exists "responses_delete_policy" on public.responses;

-- Select: Users can see their own responses OR CS can see project responses
create policy "responses_select_policy"
  on public.responses for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.blocks b
      join public.pages p on b.page_id = p.id
      where b.id = block_id
      and public.can_user_access_project(p.project_id)
    )
  );

-- Insert: Allow if user owns it OR if using admin client (portal customers)
create policy "responses_insert_policy"
  on public.responses for insert
  with check (
    auth.uid() = user_id or
    customer_email is not null
  );

-- Update: Allow if user owns it OR if using admin client (portal customers)
create policy "responses_update_policy"
  on public.responses for update
  using (
    auth.uid() = user_id or
    customer_email is not null
  );

-- Delete: Only allow if user owns it or has project access
create policy "responses_delete_policy"
  on public.responses for delete
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.blocks b
      join public.pages p on b.page_id = p.id
      where b.id = block_id
      and public.can_user_access_project(p.project_id)
    )
  );

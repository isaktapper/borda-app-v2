-- Step 12: Question Block Responses Schema

-- 1. Responses Table
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value jsonb not null, -- Stores the answer(s)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one response per user per question block
  constraint unique_response_per_user unique(block_id, user_id)
);

-- 2. Indexes
create index if not exists idx_responses_block on public.responses(block_id);
create index if not exists idx_responses_user on public.responses(user_id);

-- 3. RLS
alter table public.responses enable row level security;

-- View: CS can see all responses for projects they can access
create policy "responses_select_policy"
  on public.responses for select
  using (
    block_id in (
      select b.id from blocks b
      join pages p on b.page_id = p.id
      where public.can_user_access_project(p.project_id)
    )
  );

-- Manage: Users can create/update their own responses
create policy "responses_insert_policy"
  on public.responses for insert
  with check (auth.uid() = user_id);

create policy "responses_update_policy"
  on public.responses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Trigger for updated_at
create trigger set_responses_updated_at
  before update on public.responses
  for each row
  execute function public.handle_updated_at();

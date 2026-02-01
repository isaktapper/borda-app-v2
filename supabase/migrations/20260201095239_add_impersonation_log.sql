-- Impersonation audit log for tracking admin impersonation events
create table if not exists public.impersonation_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null,
  target_user_id uuid not null references public.users(id) on delete cascade,
  target_user_email text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Index for efficient queries
create index if not exists idx_impersonation_log_admin on public.impersonation_log(admin_user_id, created_at desc);
create index if not exists idx_impersonation_log_target on public.impersonation_log(target_user_id, created_at desc);
create index if not exists idx_impersonation_log_created on public.impersonation_log(created_at desc);

-- Enable RLS (but we'll only allow admin client to write)
alter table public.impersonation_log enable row level security;

-- Only super admins can view impersonation logs
create policy "impersonation_log_select_policy"
  on public.impersonation_log for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and is_super_admin = true
    )
  );

-- No direct insert policy - inserts are done via admin client (service role)
-- This ensures only the impersonation endpoint can write to this table

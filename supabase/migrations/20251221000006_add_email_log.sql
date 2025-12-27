-- Email Log Schema

-- 1. Email Log Table
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  type text not null,
  metadata jsonb default '{}',
  sent_at timestamptz default now()
);

-- 2. Indexes
create index idx_email_log_to_email on email_log(to_email);
create index idx_email_log_type on email_log(type);
create index idx_email_log_sent_at on email_log(sent_at desc);

-- 3. RLS Enablement
alter table public.email_log enable row level security;

-- 4. RLS Policies
-- Only admins/system can view email logs (optional, adjust based on your needs)
create policy "Authenticated users can view email logs"
  on email_log for select
  using (auth.uid() is not null);

-- System can insert email logs
create policy "System can insert email logs"
  on email_log for insert
  with check (true);

-- Activity log for tracking project events
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  actor_email text not null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Index for efficient queries
create index if not exists idx_activity_project on public.activity_log(project_id, created_at desc);
create index if not exists idx_activity_created on public.activity_log(created_at desc);

-- Enable RLS
alter table public.activity_log enable row level security;

-- RLS policies: Users can see activity for projects they have access to
create policy "activity_select_policy"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
      and public.can_user_access_project(p.id)
    )
  );

-- Allow insert for authenticated users with project access
create policy "activity_insert_policy"
  on public.activity_log for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
      and public.can_user_access_project(p.id)
    )
  );

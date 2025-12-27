-- Page Management Schema

-- 1. Pages Table
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(project_id, slug)
);

-- 2. Indexes
create index idx_pages_project on public.pages(project_id, sort_order);
create index idx_pages_deleted_at on public.pages(deleted_at);

-- 3. RLS Enablement
alter table public.pages enable row level security;

-- 4. RLS Policies

-- View: Users can see pages for projects in their organization
create policy "Users can view pages of their organization's projects"
  on pages for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
    and deleted_at is null
  );

-- Manage: Owners of projects can manage pages
create policy "Project owners can manage pages"
  on pages for all
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on public.pages
for each row
execute function public.handle_updated_at();

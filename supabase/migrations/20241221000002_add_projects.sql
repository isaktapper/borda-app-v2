-- Project Creation Schema

-- 1. Helper Function for 7-digit numeric ID
create or replace function public.generate_project_id()
returns text as $$
declare
  new_id text;
  exists_already boolean;
begin
  loop
    new_id := lpad(floor(random() * 10000000)::text, 7, '0');
    select exists(select 1 from projects where id = new_id) into exists_already;
    exit when not exists_already;
  end loop;
  return new_id;
end;
$$ language plpgsql;

-- 2. Projects Table
create table public.projects (
  id text primary key default public.generate_project_id(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  client_name text not null,
  client_logo_url text,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'paused', 'archived')),
  target_go_live_date date,
  created_by uuid not null references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- 3. Project Members Table
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'customer')),
  invited_email text,
  invited_by uuid references users(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  deleted_at timestamptz,
  unique(project_id, user_id)
);

-- 4. RLS Enablement
alter table projects enable row level security;
alter table project_members enable row level security;

-- 5. RLS Policies for Projects

-- View: Users can see projects in organizations they belong to
create policy "Users can view projects in their organization"
  on projects for select
  using (
    organization_id in (select get_user_org_ids())
    and deleted_at is null
  );

-- Insert: Users can create projects in organizations they belong to
create policy "Users can create projects in their organization"
  on projects for insert
  with check (
    organization_id in (select get_user_org_ids())
  );

-- Update: Users can update projects in their organization
create policy "Users can update projects in their organization"
  on projects for update
  using (
    organization_id in (select get_user_org_ids())
  );

-- 6. RLS Policies for Project Members

create policy "Users can view project members"
  on project_members for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

create policy "Owners can manage project members"
  on project_members for all
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
    )
  );

-- Special policy for inserting yourself as owner (handled by RPC or during createProject)
-- Since we are doing it via server action with service role or security definer if needed,
-- but for standard client we'd need:
create policy "Users can add memberships during creation"
  on project_members for insert
  with check (user_id = auth.uid());

-- 7. Indexes
create index idx_projects_organization_id on projects(organization_id);
create index idx_project_members_user_id on project_members(user_id);
create index idx_project_members_project_id on project_members(project_id);

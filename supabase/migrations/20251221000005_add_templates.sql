-- Templates Schema

-- 1. Templates Table
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  template_data jsonb not null,
  is_public boolean default false,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- 2. Indexes
create index idx_templates_org on templates(organization_id);
create index idx_templates_public on templates(is_public) where is_public = true;
create index idx_templates_deleted_at on templates(deleted_at);

-- 3. RLS Enablement
alter table public.templates enable row level security;

-- 4. RLS Policies

-- View: Users can see templates in their organization + public templates
create policy "Users can view their organization's templates and public templates"
  on templates for select
  using (
    (organization_id in (select get_user_org_ids()) or is_public = true)
    and deleted_at is null
  );

-- Insert: Users can create templates in their organization
create policy "Users can create templates in their organization"
  on templates for insert
  with check (
    organization_id in (select get_user_org_ids())
  );

-- Update: Users can update templates in their organization
create policy "Users can update templates in their organization"
  on templates for update
  using (
    organization_id in (select get_user_org_ids())
  );

-- Delete: Users can delete templates in their organization (soft delete)
create policy "Users can delete templates in their organization"
  on templates for delete
  using (
    organization_id in (select get_user_org_ids())
  );

-- 5. Trigger for updated_at
create trigger set_templates_updated_at
before update on public.templates
for each row
execute function public.handle_updated_at();

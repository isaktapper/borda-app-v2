-- Block Editor Schema

-- 1. Create blocks table
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null, -- 'text', 'task', etc.
  sort_order integer not null default 0,
  content jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- 2. Add index for performance
create index idx_blocks_page on blocks(page_id, sort_order);

-- 3. Enable RLS
alter table public.blocks enable row level security;

-- 4. RLS Policies

-- SELECT: Can view blocks for pages in their organization's projects
create policy "blocks_select_policy"
  on blocks for select
  using (
    page_id in (
      select p.id from pages p
      join projects proj on p.project_id = proj.id
      join organization_members om on proj.organization_id = om.organization_id
      where om.user_id = auth.uid()
      and p.deleted_at is null
    )
    and deleted_at is null
  );

-- INSERT: Can insert if in organization
create policy "blocks_insert_policy"
  on blocks for insert
  with check (
    page_id in (
      select p.id from pages p
      join projects proj on p.project_id = proj.id
      join organization_members om on proj.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

-- UPDATE: Can update if in organization
create policy "blocks_update_policy"
  on blocks for update
  using (
    page_id in (
      select p.id from pages p
      join projects proj on p.project_id = proj.id
      join organization_members om on proj.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

-- DELETE: Can delete if in organization
create policy "blocks_delete_policy"
  on blocks for delete
  using (
    page_id in (
      select p.id from pages p
      join projects proj on p.project_id = proj.id
      join organization_members om on proj.organization_id = om.organization_id
      where om.user_id = auth.uid()
    )
  );

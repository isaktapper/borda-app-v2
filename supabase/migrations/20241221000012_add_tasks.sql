-- Step 10: Task-block Schema

-- 1. Tasks Table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending',
  due_date date,
  assignee_id uuid references auth.users(id),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint tasks_status_check check (status in ('pending', 'in_progress', 'completed'))
);

-- 2. Indexes
create index idx_tasks_project on public.tasks(project_id, status);
create index idx_tasks_block on public.tasks(block_id);

-- 3. RLS Enablement
alter table public.tasks enable row level security;

-- 4. RLS Policies

-- View: Users can see tasks for projects in their organization
create policy "tasks_select_policy"
  on tasks for select
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

-- Manage: Users in organization can create/update tasks
create policy "tasks_insert_policy"
  on tasks for insert
  with check (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

create policy "tasks_update_policy"
  on tasks for update
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  )
  with check (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

create policy "tasks_delete_policy"
  on tasks for delete
  using (
    project_id in (
      select id from projects 
      where organization_id in (select get_user_org_ids())
    )
  );

-- 5. Trigger for updated_at
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.handle_updated_at();

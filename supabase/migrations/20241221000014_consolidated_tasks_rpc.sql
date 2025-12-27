-- Consolidated Step 10: Tasks Table & Deletion RPC

-- 1. Create Tasks Table (if not exists)
create table if not exists public.tasks (
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
create index if not exists idx_tasks_project on public.tasks(project_id, status);
create index if not exists idx_tasks_block on public.tasks(block_id);

-- 3. RLS
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_policy" on tasks;
create policy "tasks_select_policy" on tasks for select
  using (can_user_access_project(project_id));

drop policy if exists "tasks_insert_policy" on tasks;
create policy "tasks_insert_policy" on tasks for insert
  with check (can_user_access_project(project_id));

drop policy if exists "tasks_update_policy" on tasks;
create policy "tasks_update_policy" on tasks for update
  using (can_user_access_project(project_id))
  with check (can_user_access_project(project_id));

drop policy if exists "tasks_delete_policy" on tasks;
create policy "tasks_delete_policy" on tasks for delete
  using (can_user_access_project(project_id));

-- 4. Trigger
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- 5. Verbose Deletion RPC
drop function if exists public.delete_block_rpc(uuid);

create or replace function public.delete_block_rpc(p_block_id uuid)
returns jsonb as $$
declare
  v_project_id text;
  v_affected integer;
begin
  select p.project_id into v_project_id
  from public.blocks b
  join public.pages p on b.page_id = p.id
  where b.id = p_block_id;

  if v_project_id is null then
    if exists (select 1 from public.blocks where id = p_block_id) then
        return jsonb_build_object('success', true, 'message', 'Block already soft-deleted or page mismatch');
    else
        return jsonb_build_object('success', true, 'message', 'Block not found, already gone');
    end if;
  end if;

  if not public.can_user_access_project(v_project_id) then
    return jsonb_build_object('success', false, 'message', 'Access denied to project ' || v_project_id);
  end if;

  -- Hard delete task
  delete from public.tasks where block_id = p_block_id;

  -- Soft delete block
  update public.blocks 
  set deleted_at = now(),
      updated_at = now()
  where id = p_block_id;
  
  get diagnostics v_affected = row_count;
  return jsonb_build_object('success', true, 'message', 'Deleted successfully');
end;
$$ language plpgsql security definer set search_path = public;

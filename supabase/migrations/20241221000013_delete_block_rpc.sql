-- Step 10 Bug Fix: Verbose Idempotent Block Deletion RPC

create or replace function public.delete_block_rpc(p_block_id uuid)
returns jsonb as $$
declare
  v_project_id text;
  v_affected integer;
begin
  -- 1. Get project context
  select p.project_id into v_project_id
  from public.blocks b
  join public.pages p on b.page_id = p.id
  where b.id = p_block_id;

  -- 2. If block not found, check if it exists at all (even if deleted)
  if v_project_id is null then
    if exists (select 1 from public.blocks where id = p_block_id) then
        return jsonb_build_object('success', true, 'message', 'Block already soft-deleted or page mismatch');
    else
        return jsonb_build_object('success', true, 'message', 'Block not found, already gone');
    end if;
  end if;

  -- 3. Verify access
  if not public.can_user_access_project(v_project_id) then
    return jsonb_build_object('success', false, 'message', 'Access denied to project ' || v_project_id);
  end if;

  -- 4. Hard delete task
  delete from public.tasks where block_id = p_block_id;

  -- 5. Soft delete block
  update public.blocks 
  set deleted_at = now(),
      updated_at = now()
  where id = p_block_id;
  
  get diagnostics v_affected = row_count;

  if v_affected = 0 then
    return jsonb_build_object('success', false, 'message', 'Update failed for unknown reason');
  end if;

  return jsonb_build_object('success', true, 'message', 'Deleted successfully');
end;
$$ language plpgsql security definer set search_path = public;

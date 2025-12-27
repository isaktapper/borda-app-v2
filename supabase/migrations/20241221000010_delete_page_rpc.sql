-- RPC for soft-deleting a page to solve RLS issues

create or replace function public.delete_page_rpc(p_page_id uuid, p_project_id text)
returns void as $$
begin
  -- 1. Security Check: Ensure user belongs to the project's organization
  if not exists (
    select 1 from public.projects p
    join public.organization_members om on p.organization_id = om.organization_id
    where p.id = p_project_id
    and om.user_id = auth.uid()
  ) then
    raise exception 'Unauthorized: User does not have access to this project';
  end if;

  -- 2. Perform soft delete
  update public.pages
  set deleted_at = now()
  where id = p_page_id
  and project_id = p_project_id;
end;
$$ language plpgsql security definer set search_path = public;

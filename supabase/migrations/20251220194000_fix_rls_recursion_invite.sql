-- Fix RLS Recursion by removing the crossing policies
drop policy if exists "pm_select_public_invite" on public.project_members;
drop policy if exists "projects_select_public_invite" on public.projects;

-- Re-ensure our RPC is robust and returns everything needed for the UI
create or replace function public.validate_project_invite(p_project_id text, p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_data json;
begin
  select json_build_object(
    'id', pm.id,
    'project_id', pm.project_id,
    'invited_email', pm.invited_email,
    'invite_expires_at', pm.invite_expires_at,
    'client_name', p.client_name
  ) into invite_data
  from project_members pm
  join projects p on pm.project_id = p.id
  where pm.project_id = p_project_id
  and pm.invite_token = p_token
  and pm.joined_at is null
  and (pm.invite_expires_at is null or pm.invite_expires_at > now());

  return invite_data;
end;
$$;

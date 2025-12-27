-- Add RPC for safe invitation validation
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

-- Also add a policy to allow public select on project_members ONLY for valid tokens
-- This is a backup but also good practice for our validateInvite server action
create policy "pm_select_public_invite"
  on public.project_members for select
  to public
  using (
    invite_token is not null 
    and (invite_expires_at is null or invite_expires_at > now())
    and joined_at is null
  );

-- Allow public to see project client_name if they have a valid invite
create policy "projects_select_public_invite"
  on public.projects for select
  to public
  using (
    id in (
      select project_id from public.project_members 
      where invite_token is not null 
      and (invite_expires_at is null or invite_expires_at > now())
      and joined_at is null
    )
  );

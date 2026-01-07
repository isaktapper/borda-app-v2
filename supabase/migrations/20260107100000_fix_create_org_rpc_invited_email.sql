-- Fix create_organization_rpc to include invited_email (now required)
create or replace function public.create_organization_rpc(
  p_name text,
  p_slug text,
  p_domain text default null
)
returns json
language plpgsql
security definer -- Run as owner to bypass RLS during creation
as $$
declare
  new_org_id uuid;
  new_org_data json;
  user_email text;
begin
  -- Get the current user's email
  select email into user_email
  from auth.users
  where id = auth.uid();

  -- 1. Insert Organization
  insert into organizations (name, slug, domain)
  values (p_name, p_slug, p_domain)
  returning id into new_org_id;

  -- 2. Insert Membership (Owner) with invited_email
  insert into organization_members (organization_id, user_id, role, invited_email, invited_by, invited_at)
  values (new_org_id, auth.uid(), 'owner', user_email, auth.uid(), now());

  -- 3. Return the new organization data
  select json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug
  ) into new_org_data
  from organizations o
  where o.id = new_org_id;

  return new_org_data;
end;
$$;


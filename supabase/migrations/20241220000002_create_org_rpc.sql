-- RPC for atomic organization creation
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
begin
  -- 1. Insert Organization
  insert into organizations (name, slug, domain)
  values (p_name, p_slug, p_domain)
  returning id into new_org_id;

  -- 2. Insert Membership (Owner)
  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

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

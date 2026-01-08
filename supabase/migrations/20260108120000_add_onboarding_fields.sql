-- Add onboarding fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS company_size text,
ADD COLUMN IF NOT EXISTS referral_source text,
ADD COLUMN IF NOT EXISTS referral_source_other text;

-- Update create_organization_rpc to accept new onboarding fields
CREATE OR REPLACE FUNCTION public.create_organization_rpc(
  p_name text,
  p_slug text,
  p_domain text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_company_size text DEFAULT NULL,
  p_referral_source text DEFAULT NULL,
  p_referral_source_other text DEFAULT NULL,
  p_brand_color text DEFAULT NULL,
  p_logo_path text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass RLS during creation
AS $$
DECLARE
  new_org_id uuid;
  new_org_data json;
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- 1. Insert Organization with all onboarding fields
  INSERT INTO organizations (
    name, 
    slug, 
    domain, 
    industry, 
    company_size, 
    referral_source, 
    referral_source_other,
    brand_color,
    logo_path
  )
  VALUES (
    p_name, 
    p_slug, 
    p_domain, 
    p_industry, 
    p_company_size, 
    p_referral_source, 
    p_referral_source_other,
    p_brand_color,
    p_logo_path
  )
  RETURNING id INTO new_org_id;

  -- 2. Insert Membership (Owner) with invited_email
  INSERT INTO organization_members (organization_id, user_id, role, invited_email, invited_by, invited_at)
  VALUES (new_org_id, auth.uid(), 'owner', user_email, auth.uid(), now());

  -- 3. Return the new organization data
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'industry', o.industry,
    'company_size', o.company_size
  ) INTO new_org_data
  FROM organizations o
  WHERE o.id = new_org_id;

  RETURN new_org_data;
END;
$$;


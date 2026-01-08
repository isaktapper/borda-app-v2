-- Fix infinite recursion in space_members RLS policies
-- The issue is that policies on space_members reference space_members, causing infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Owners can manage space members" ON space_members;
DROP POLICY IF EXISTS "Users can view space members" ON space_members;
DROP POLICY IF EXISTS "Users can add memberships during creation" ON space_members;
DROP POLICY IF EXISTS "pm_select_authenticated" ON space_members;
DROP POLICY IF EXISTS "pm_insert_manager" ON space_members;
DROP POLICY IF EXISTS "pm_update_manager" ON space_members;
DROP POLICY IF EXISTS "pm_delete_manager" ON space_members;

-- Create a SECURITY DEFINER function to check space membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_space_member(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a SECURITY DEFINER function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_space_owner(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = auth.uid()
    AND role = 'owner'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the SECURITY DEFINER functions (which bypass RLS)

-- SELECT: Users can view members of spaces in their organization
CREATE POLICY "space_members_select_policy" ON space_members FOR SELECT
  USING (
    space_id IN (
      SELECT id FROM spaces 
      WHERE organization_id IN (SELECT get_user_org_ids())
      AND deleted_at IS NULL
    )
  );

-- INSERT: Users can insert themselves as members, or owners can add others
CREATE POLICY "space_members_insert_policy" ON space_members FOR INSERT
  WITH CHECK (
    -- Allow users to add themselves
    user_id = auth.uid()
    OR
    -- Or allow if user has access to the space (via organization)
    space_id IN (
      SELECT id FROM spaces 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- UPDATE: Only space owners can update members (using SECURITY DEFINER function)
CREATE POLICY "space_members_update_policy" ON space_members FOR UPDATE
  USING (is_space_owner(space_id));

-- DELETE: Only space owners can delete members (using SECURITY DEFINER function)
CREATE POLICY "space_members_delete_policy" ON space_members FOR DELETE
  USING (is_space_owner(space_id));


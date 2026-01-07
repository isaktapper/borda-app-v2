-- Fix projects UPDATE policy to allow soft deletes
-- The issue is that UPDATE policy needs explicit WITH CHECK clause

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update projects in their organization" ON projects;

-- Recreate with explicit WITH CHECK that allows soft deletes
CREATE POLICY "Users can update projects in their organization"
  ON projects FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

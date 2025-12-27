-- Fix RLS policies for organizations table to allow branding updates

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update own org branding" ON organizations;

-- Allow users to update branding fields in their own organizations
CREATE POLICY "Users can update own org branding"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Verify existing select policy exists (users should be able to read their orgs)
-- If not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations'
    AND policyname = 'Users can view their organizations'
  ) THEN
    CREATE POLICY "Users can view their organizations"
    ON organizations
    FOR SELECT
    TO authenticated
    USING (
      id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

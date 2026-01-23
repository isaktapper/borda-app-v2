-- Fix access_requests INSERT policy to prevent abuse
-- Only allow inserts when:
-- 1. The organization exists and is not deleted
-- 2. The organization has join_policy = 'invite_only'

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert access requests" ON access_requests;

-- Create a more restrictive policy
-- Note: This runs as ANON/SERVICE role since users don't have accounts yet when requesting access
CREATE POLICY "Can insert access requests for invite_only orgs"
  ON access_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.deleted_at IS NULL
      AND o.join_policy = 'invite_only'
    )
  );

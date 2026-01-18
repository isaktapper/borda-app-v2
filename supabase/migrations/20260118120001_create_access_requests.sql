-- Create access_requests table for tracking join requests
-- Used when organization has join_policy = 'invite_only'

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_access_requests_organization_id ON access_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- Prevent duplicate pending requests from same email to same org
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_pending_unique 
ON access_requests(email, organization_id) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Owners and admins can view access requests for their organization
CREATE POLICY "Org owners and admins can view access requests"
  ON access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = access_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.deleted_at IS NULL
    )
  );

-- Owners and admins can update access requests (approve/deny)
CREATE POLICY "Org owners and admins can update access requests"
  ON access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = access_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.deleted_at IS NULL
    )
  );

-- Anyone can insert an access request (used during signup before user exists)
-- This will be done via a security definer function instead for better control
CREATE POLICY "Service role can insert access requests"
  ON access_requests FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE access_requests IS 'Tracks requests from users wanting to join an invite_only organization';
COMMENT ON COLUMN access_requests.status IS 'pending = awaiting review, approved = user was added, denied = request rejected';

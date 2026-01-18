-- Add join_policy column to organizations table
-- This controls how users with matching email domains can join the organization

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS join_policy text DEFAULT 'invite_only' 
CHECK (join_policy IN ('invite_only', 'domain_auto_join'));

-- Add unique constraint on domain (excluding null values)
-- This ensures each domain can only belong to one organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_domain_unique 
ON organizations(domain) WHERE domain IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN organizations.join_policy IS 'Controls how users with matching email domains can join: invite_only requires admin approval, domain_auto_join allows automatic joining';

-- Backfill existing organizations to domain_auto_join to preserve current behavior
-- (Current behavior allows auto-join if domain matches)
UPDATE organizations 
SET join_policy = 'domain_auto_join' 
WHERE domain IS NOT NULL AND join_policy IS NULL;

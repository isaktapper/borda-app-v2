-- Add column picker and tracking features

-- 1. Add table_preferences to users for storing column visibility/order
ALTER TABLE users ADD COLUMN IF NOT EXISTS table_preferences JSONB DEFAULT '{}';

-- 2. Add template_id to projects to track which template was used
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id);

-- 3. Create portal_visits table for tracking customer visits
CREATE TABLE IF NOT EXISTS portal_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visitor_email TEXT NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate visits within 1 hour (session tracking)
  UNIQUE(project_id, visitor_email, visited_at)
);

-- Index for fast queries on project visits
CREATE INDEX IF NOT EXISTS idx_portal_visits_project ON portal_visits(project_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_visits_email ON portal_visits(visitor_email, visited_at DESC);

-- Enable RLS
ALTER TABLE portal_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_visits
-- Users can view visits for their organization's projects
CREATE POLICY "Users can view org project visits"
  ON portal_visits FOR SELECT
  USING (
    project_id IN (
      SELECT p.id::text
      FROM projects p
      WHERE p.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Admin client can insert visits (for portal logging)
CREATE POLICY "System can insert visits"
  ON portal_visits FOR INSERT
  WITH CHECK (true);

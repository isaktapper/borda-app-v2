-- Migration: Add Microsoft Teams Integration
-- Created: 2026-01-09
-- Description: Creates tables and policies for Teams webhook integration

-- =====================================================
-- Table: teams_integrations
-- =====================================================

CREATE TABLE IF NOT EXISTS teams_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  channel_name text,  -- Optional friendly name for the channel
  enabled_events jsonb NOT NULL DEFAULT '["task.completed", "form.submitted", "file.uploaded", "portal.first_visit", "space.status_changed"]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_notification_at timestamptz,
  error_count integer NOT NULL DEFAULT 0,
  last_error_at timestamptz,
  last_error_message text,
  installed_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT teams_integrations_organization_id_unique UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE teams_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams_integrations
CREATE POLICY "Users can view org teams integration"
  ON teams_integrations FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Admins can insert teams integration"
  ON teams_integrations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update teams integration"
  ON teams_integrations FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Indexes for teams_integrations
CREATE INDEX idx_teams_integrations_organization_id ON teams_integrations(organization_id);
CREATE INDEX idx_teams_integrations_deleted_at ON teams_integrations(deleted_at);

-- =====================================================
-- Table: teams_notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS teams_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teams_integration_id uuid NOT NULL REFERENCES teams_integrations(id) ON DELETE CASCADE,
  activity_log_id uuid REFERENCES activity_log(id),
  space_id text REFERENCES spaces(id),
  event_type text NOT NULL,
  message_payload jsonb NOT NULL,  -- Teams Adaptive Card JSON payload
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE teams_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams_notifications
CREATE POLICY "Users can view org teams notifications"
  ON teams_notifications FOR SELECT
  USING (
    teams_integration_id IN (
      SELECT id FROM teams_integrations
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Indexes for teams_notifications
CREATE INDEX idx_teams_notifications_integration_id ON teams_notifications(teams_integration_id);
CREATE INDEX idx_teams_notifications_status ON teams_notifications(status);
CREATE INDEX idx_teams_notifications_created_at ON teams_notifications(created_at);
CREATE INDEX idx_teams_notifications_space_id ON teams_notifications(space_id);
CREATE INDEX idx_teams_notifications_event_type ON teams_notifications(event_type);

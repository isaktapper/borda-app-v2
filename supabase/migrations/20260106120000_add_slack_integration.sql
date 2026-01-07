-- Slack Integration Tables
-- Stores OAuth connections and notification preferences for Slack workspaces

-- Main table for Slack workspace connections
CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- OAuth token data (should be encrypted at application level in production)
  access_token TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,

  -- Workspace information
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,

  -- Notification preferences
  notification_channel_id TEXT,
  notification_channel_name TEXT,

  -- Event filters (JSONB for flexibility)
  enabled_events JSONB NOT NULL DEFAULT '["task.completed", "form.answered", "file.uploaded"]'::jsonb,

  -- Token metadata
  scope TEXT NOT NULL,
  token_type TEXT DEFAULT 'bot',

  -- Status tracking
  enabled BOOLEAN DEFAULT true,
  last_notification_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,

  -- Audit fields
  installed_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT slack_integrations_org_unique UNIQUE(organization_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_slack_integrations_org ON slack_integrations(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_slack_integrations_team ON slack_integrations(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_slack_integrations_enabled ON slack_integrations(enabled) WHERE deleted_at IS NULL AND enabled = true;

-- Enable RLS
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their org's integration
CREATE POLICY "slack_integrations_select_policy"
  ON slack_integrations FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids())
  );

-- Only admins/owners can insert integrations
CREATE POLICY "slack_integrations_insert_policy"
  ON slack_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = slack_integrations.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Only admins/owners can update integrations
CREATE POLICY "slack_integrations_update_policy"
  ON slack_integrations FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_org_ids())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = slack_integrations.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE slack_integrations IS 'Stores Slack workspace OAuth connections for organizations';
COMMENT ON COLUMN slack_integrations.enabled_events IS 'Array of activity_log action names that trigger notifications';
COMMENT ON COLUMN slack_integrations.access_token IS 'Bot user OAuth token - should be encrypted at application level in production';

-- Notification delivery log for debugging and analytics
CREATE TABLE IF NOT EXISTS slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_integration_id UUID NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,

  -- Activity reference
  activity_log_id UUID REFERENCES activity_log(id) ON DELETE SET NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),

  -- Notification details
  event_type TEXT NOT NULL,
  message_payload JSONB NOT NULL,

  -- Delivery tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  slack_ts TEXT,
  slack_channel TEXT,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Indexes for queries
CREATE INDEX idx_slack_notifications_integration ON slack_notifications(slack_integration_id, created_at DESC);
CREATE INDEX idx_slack_notifications_project ON slack_notifications(project_id, created_at DESC);
CREATE INDEX idx_slack_notifications_status ON slack_notifications(status) WHERE status = 'pending';
CREATE INDEX idx_slack_notifications_activity ON slack_notifications(activity_log_id);

-- Enable RLS
ALTER TABLE slack_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view notifications for their org's integrations
CREATE POLICY "slack_notifications_select_policy"
  ON slack_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM slack_integrations si
      WHERE si.id = slack_integration_id
      AND si.organization_id IN (SELECT get_user_org_ids())
    )
  );

COMMENT ON TABLE slack_notifications IS 'Audit log for Slack notification delivery';
COMMENT ON COLUMN slack_notifications.slack_ts IS 'Slack message timestamp for threading/updates';

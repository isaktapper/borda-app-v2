-- Email Log Table
-- Centralized logging for all emails sent from the platform

-- 1. Create email_log table
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic email fields
  to_email text NOT NULL,
  from_email text,
  subject text NOT NULL,

  -- Categorization
  type text NOT NULL,  -- 'welcome', 'org_invite', 'stakeholder_invite', 'task_reminder', 'access_request_notification', 'access_request_approved', 'access_request_denied'

  -- Relations (for tracking and deduplication)
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  space_id text REFERENCES spaces(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_member_id uuid REFERENCES space_members(id) ON DELETE SET NULL,

  -- Status tracking
  status text NOT NULL DEFAULT 'sent',  -- 'sent', 'failed', 'bounced'
  error_message text,

  -- Flexible metadata per email type
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for common queries
CREATE INDEX idx_email_log_to_email ON email_log(to_email);
CREATE INDEX idx_email_log_type ON email_log(type);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at DESC);
CREATE INDEX idx_email_log_organization_id ON email_log(organization_id);
CREATE INDEX idx_email_log_space_id ON email_log(space_id);
CREATE INDEX idx_email_log_status ON email_log(status);

-- Composite index for task reminder deduplication
CREATE INDEX idx_email_log_task_reminder_dedup
  ON email_log(type, to_email, space_id, sent_at)
  WHERE type = 'task_reminder';

-- 3. Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Staff can view email logs for their organizations
CREATE POLICY "Users can view email logs for their organizations"
  ON email_log FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids())
    OR organization_id IS NULL
  );

-- System/service role can insert (used by sendEmail function)
CREATE POLICY "Service role can insert email logs"
  ON email_log FOR INSERT
  WITH CHECK (true);

-- 5. Comments for documentation
COMMENT ON TABLE email_log IS 'Centralized log of all emails sent from the platform';
COMMENT ON COLUMN email_log.type IS 'Email type: welcome, org_invite, stakeholder_invite, task_reminder, access_request_notification, access_request_approved, access_request_denied';
COMMENT ON COLUMN email_log.metadata IS 'Type-specific data. task_reminder: {task_ids, due_date}. invites: {token}';
COMMENT ON COLUMN email_log.status IS 'Delivery status: sent, failed, bounced';

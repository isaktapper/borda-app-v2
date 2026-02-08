-- Migration: Add chat messages and notifications tables
-- This enables real-time communication between stakeholders and staff

-- ============================================================================
-- STEP 1: Create messages table
-- ============================================================================

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id text NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Sender information
  sender_user_id uuid REFERENCES users(id),
  sender_email text NOT NULL,
  sender_name text,
  is_from_stakeholder boolean NOT NULL DEFAULT false,

  -- Message content
  content text NOT NULL,

  -- Mentions (array of emails that were @mentioned)
  mentions text[] DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Index for fetching messages by space (most common query)
CREATE INDEX idx_messages_space ON messages(space_id, created_at DESC);

-- Index for finding messages by sender
CREATE INDEX idx_messages_sender ON messages(sender_user_id) WHERE sender_user_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Create notifications table
-- ============================================================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient (user_id for staff, email for stakeholders)
  recipient_user_id uuid REFERENCES users(id),
  recipient_email text,

  -- Source information
  type text NOT NULL, -- 'chat_message', etc.
  space_id text REFERENCES spaces(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,

  -- Status
  read_at timestamptz,
  email_sent_at timestamptz,

  -- Display content
  title text NOT NULL,
  body text,
  link text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Index for fetching user notifications (most common query)
CREATE INDEX idx_notifications_user ON notifications(recipient_user_id, read_at, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

-- Index for fetching stakeholder notifications by email
CREATE INDEX idx_notifications_email ON notifications(recipient_email, read_at, created_at DESC)
  WHERE recipient_email IS NOT NULL;

-- Index for finding notifications by message
CREATE INDEX idx_notifications_message ON notifications(message_id) WHERE message_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Enable RLS on both tables
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies for messages
-- ============================================================================

-- Staff can view messages in spaces they have access to (via org membership)
CREATE POLICY "Users can view messages in their spaces"
  ON messages FOR SELECT
  USING (
    space_id IN (
      SELECT s.id FROM spaces s
      WHERE s.organization_id IN (SELECT get_user_org_ids())
      AND s.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Staff can insert messages in their spaces
CREATE POLICY "Users can send messages in their spaces"
  ON messages FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT s.id FROM spaces s
      WHERE s.organization_id IN (SELECT get_user_org_ids())
      AND s.deleted_at IS NULL
    )
  );

-- Staff can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (sender_user_id = auth.uid())
  WITH CHECK (sender_user_id = auth.uid());

-- ============================================================================
-- STEP 5: Create RLS policies for notifications
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- System can insert notifications (via admin client)
-- No INSERT policy for regular users - notifications are created server-side

-- ============================================================================
-- STEP 6: Create helper function to check if a user can access space messages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_user_send_message(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM spaces s
    WHERE s.id = p_space_id
    AND s.organization_id IN (SELECT get_user_org_ids())
    AND s.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Add space_id to email_log if not exists (for rate limiting)
-- ============================================================================

-- Check if column exists first (it should from previous migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_log'
    AND column_name = 'space_id'
  ) THEN
    ALTER TABLE email_log ADD COLUMN space_id text REFERENCES spaces(id);
  END IF;
END $$;

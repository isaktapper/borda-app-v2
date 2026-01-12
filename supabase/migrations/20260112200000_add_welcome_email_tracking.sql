-- Migration: Add welcome email tracking
-- This adds a column to track if welcome email has been sent,
-- preventing duplicate sends if the webhook is called multiple times.

-- Note: The actual webhook needs to be configured in Supabase Dashboard:
-- Database > Webhooks > Create new webhook
-- 
-- Configuration:
-- - Name: welcome_email
-- - Table: auth.users
-- - Events: UPDATE
-- - URL: https://your-app.vercel.app/api/webhooks/welcome-email
-- - Headers: Authorization: Bearer <WEBHOOK_SECRET>

-- Add tracking column to users table (if you want to track welcome email status)
-- This is optional but recommended to prevent duplicate sends
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.welcome_email_sent_at IS 'Timestamp when welcome email was sent to this user';

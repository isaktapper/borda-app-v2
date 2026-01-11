-- Migration: Add welcome popup feature
-- Adds welcome_popup jsonb to spaces table
-- Adds welcome_popup_dismissed_at to space_members table

-- ============================================================================
-- Add welcome_popup column to spaces
-- ============================================================================
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS welcome_popup jsonb DEFAULT NULL;

-- Structure of welcome_popup:
-- {
--   "enabled": boolean,
--   "title": string,
--   "description": string,
--   "imageUrl": string | null,
--   "videoUrl": string | null,
--   "ctaText": string | null,
--   "ctaAction": "dismiss" | "go_to_page" | "link",
--   "ctaPageId": string | null,
--   "ctaLink": string | null
-- }

COMMENT ON COLUMN spaces.welcome_popup IS 'Welcome popup configuration shown to stakeholders on first visit';

-- ============================================================================
-- Add welcome_popup_dismissed_at to space_members
-- Tracks when each stakeholder dismissed the welcome popup
-- ============================================================================
ALTER TABLE space_members ADD COLUMN IF NOT EXISTS welcome_popup_dismissed_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN space_members.welcome_popup_dismissed_at IS 'When stakeholder dismissed the welcome popup (null = not seen yet)';

-- ============================================================================
-- Add index for efficient lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_space_members_welcome_popup 
ON space_members(space_id, welcome_popup_dismissed_at) 
WHERE welcome_popup_dismissed_at IS NULL;

-- Add session_duration_seconds column to portal_visits
-- This tracks how long each stakeholder spends in the portal per session

ALTER TABLE portal_visits 
ADD COLUMN IF NOT EXISTS session_duration_seconds INTEGER;

-- Add index for querying sessions with duration
CREATE INDEX IF NOT EXISTS idx_portal_visits_duration 
ON portal_visits(space_id, session_duration_seconds) 
WHERE session_duration_seconds IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN portal_visits.session_duration_seconds IS 'Duration of the portal session in seconds, logged when stakeholder leaves the portal';

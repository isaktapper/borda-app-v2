-- Add engagement factors column to store the breakdown
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS engagement_factors JSONB;

-- Add comment to explain structure
COMMENT ON COLUMN projects.engagement_factors IS 'Stores engagement score breakdown: {visits: {score, count}, tasks: {score, completed, total}, questions: {score, answered, total}, files: {score, uploaded, total}, checklists: {score, completed, total}}';

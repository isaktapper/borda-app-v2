-- Add timeline to the allowed block types

-- Step 1: Drop the existing check constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

-- Step 2: Create new check constraint including timeline
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
CHECK (type IN ('text', 'task', 'form', 'question', 'checklist', 'file_upload', 'file_download', 'embed', 'contact', 'divider', 'meeting', 'action_plan', 'media', 'accordion', 'timeline'));

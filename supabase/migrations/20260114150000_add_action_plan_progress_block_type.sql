-- Add action_plan_progress to the allowed block types

-- Step 1: Drop the existing check constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

-- Step 2: Create new check constraint including action_plan_progress
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
CHECK (type IN ('text', 'task', 'form', 'question', 'checklist', 'file_upload', 'file_download', 'embed', 'contact', 'divider', 'meeting', 'action_plan', 'media', 'accordion', 'timeline', 'next_task', 'action_plan_progress'));

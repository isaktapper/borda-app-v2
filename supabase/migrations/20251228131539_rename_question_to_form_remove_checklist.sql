-- Step 1: Drop the existing check constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

-- Step 2: Rename question block type to form
UPDATE blocks
SET type = 'form'
WHERE type = 'question' AND deleted_at IS NULL;

-- Step 3: Soft delete all checklist blocks
UPDATE blocks
SET deleted_at = NOW()
WHERE type = 'checklist' AND deleted_at IS NULL;

-- Step 4: Create new check constraint with all possible types (for backwards compatibility)
-- Including both old and new types to avoid breaking existing data
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
CHECK (type IN ('text', 'task', 'form', 'question', 'checklist', 'file_upload', 'file_download', 'embed', 'contact', 'divider', 'meeting'));

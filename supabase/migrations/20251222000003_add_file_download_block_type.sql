-- Add file_download to blocks.type constraint
-- This enables CS to upload files for customers to download

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
  CHECK (type IN (
    'text',
    'task',
    'file_upload',
    'file_download',
    'question',
    'checklist',
    'embed',
    'contact',
    'divider'
  ));

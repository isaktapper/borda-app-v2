-- Add unique constraint on block_id to tasks table
-- This allows upsert operations with ON CONFLICT (block_id) to work correctly

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_block_id_unique UNIQUE (block_id);

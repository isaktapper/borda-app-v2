-- Fix delete_block_rpc to not try soft-delete on tasks table (which has no deleted_at column)
-- The tasks table uses hard delete (and has ON DELETE CASCADE from blocks anyway)

DROP FUNCTION IF EXISTS delete_block_rpc(uuid);

CREATE OR REPLACE FUNCTION public.delete_block_rpc(p_block_id uuid)
RETURNS void AS $$
BEGIN
  -- Hard delete tasks associated with this block (tasks has no deleted_at column)
  DELETE FROM tasks WHERE block_id = p_block_id;
  
  -- Soft delete files associated with this block (files HAS deleted_at)
  UPDATE files SET deleted_at = NOW() WHERE block_id = p_block_id AND deleted_at IS NULL;
  
  -- Soft delete the block itself (blocks HAS deleted_at)
  UPDATE blocks SET deleted_at = NOW() WHERE id = p_block_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


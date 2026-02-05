-- Migration: Add block mentions to messages
-- Allows users to #mention blocks in chat messages

-- Add mentioned_blocks column to store references to blocks that were #mentioned
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentioned_blocks uuid[] DEFAULT '{}';

-- Index for finding messages that mention a specific block
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_blocks ON messages USING GIN(mentioned_blocks);

-- Add read receipts and typing indicators to chat

-- Add columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT,
  typing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policies for typing indicators
CREATE POLICY "Anyone authenticated can view typing indicators"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own typing indicator"
  ON chat_typing_indicators FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = TRUE,
      read_at = NOW()
  WHERE recipient_id IS NULL  -- Group messages
    AND admin_id != user_id   -- Don't mark own messages
    AND is_read = FALSE;      -- Only unread
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_typing_indicators
  WHERE created_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read, admin_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_created ON chat_typing_indicators(created_at);

COMMENT ON TABLE chat_typing_indicators IS 'Tracks which admins are currently typing in chat';
COMMENT ON COLUMN chat_messages.is_read IS 'Whether the message has been read by recipients';
COMMENT ON COLUMN chat_messages.read_at IS 'When the message was marked as read';
COMMENT ON COLUMN chat_messages.delivered_at IS 'When the message was delivered';

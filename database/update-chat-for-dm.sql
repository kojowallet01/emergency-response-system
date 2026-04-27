-- Update chat_messages table to support Direct Messages
-- Add recipient_id column for 1-on-1 conversations
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for efficient DM queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(admin_id, recipient_id);

-- Update RLS policies for DMs
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;

-- Policy: Admins can view messages they sent or received
CREATE POLICY "Admins can view their messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND (
      admin_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- Policy: Admins can send messages
CREATE POLICY "Admins can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
    AND recipient_id IS NOT NULL
    AND recipient_id != auth.uid()
  );

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Verify policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'chat_messages';

-- Revert chat_messages table to simple group chat
-- Make recipient_id optional (allow NULL for group chat)
ALTER TABLE chat_messages ALTER COLUMN recipient_id DROP NOT NULL;

-- Drop all existing DM policies
DROP POLICY IF EXISTS "Admins can view their messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to view messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;

-- Create simple group chat policies
CREATE POLICY "Authenticated users can view all messages"
ON chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can send messages"
ON chat_messages FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());

-- Optional: Clear existing DM messages to start fresh with group chat
-- Uncomment the line below if you want to clear all existing messages
-- DELETE FROM chat_messages WHERE recipient_id IS NOT NULL;

-- Verify the policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'chat_messages';

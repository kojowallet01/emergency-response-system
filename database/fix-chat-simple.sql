-- Simplest possible chat policies - should work 100%

-- Drop all policies
DROP POLICY IF EXISTS "group_chat_select" ON chat_messages;
DROP POLICY IF EXISTS "group_chat_insert" ON chat_messages;

-- Create the simplest policies possible
-- Allow ALL authenticated users to do everything
CREATE POLICY "allow_all_select"
ON chat_messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "allow_all_insert"
ON chat_messages FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'chat_messages';

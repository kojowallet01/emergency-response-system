-- Clean fix for chat policies
-- This handles the case where policies might already exist

-- Step 1: Drop ALL existing policies (no errors if they don't exist)
DROP POLICY IF EXISTS "Admins can view their messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to view messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;

-- Step 2: Make recipient_id optional (ignore error if already done)
DO $$ 
BEGIN
  ALTER TABLE chat_messages ALTER COLUMN recipient_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Step 3: Create the correct group chat policies
CREATE POLICY "group_chat_select"
ON chat_messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "group_chat_insert"
ON chat_messages FOR INSERT 
TO authenticated 
WITH CHECK (admin_id = auth.uid());

-- Step 4: Verify the policies
SELECT 
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'chat_messages';

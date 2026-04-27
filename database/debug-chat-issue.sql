-- Debug chat_messages issue
-- Run this to see what's wrong

-- 1. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 2. Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages';

-- 3. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'chat_messages';

-- 4. Try a test insert (this will show the actual error)
-- Replace 'YOUR_USER_ID' with your actual user_id from auth.users
-- SELECT auth.uid(); -- Run this first to get your user_id

-- Then try:
-- INSERT INTO chat_messages (admin_id, recipient_id, message)
-- VALUES ('YOUR_USER_ID', NULL, 'Test message');

-- Fix Responder Login - Allow Public Access
-- Run this in Supabase SQL Editor

-- 1. Disable RLS temporarily to test
ALTER TABLE responders DISABLE ROW LEVEL SECURITY;

-- 2. Verify responders exist
SELECT * FROM responders ORDER BY responder_id;

-- 3. Test query (this is what the app runs)
SELECT * FROM responders WHERE responder_id = 'FIRE001';

-- If the above works, the issue is RLS policies
-- Re-enable RLS with proper policies:

-- 4. Re-enable RLS
ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Anyone can view responders" ON responders;
DROP POLICY IF EXISTS "Admins can manage responders" ON responders;

-- 6. Create new policy for PUBLIC access (no authentication required)
CREATE POLICY "Public can view responders"
ON responders FOR SELECT
TO anon, authenticated
USING (true);

-- 7. Create policy for authenticated users to update
CREATE POLICY "Authenticated can update responders"
ON responders FOR UPDATE
TO authenticated
USING (true);

-- 8. Create policy for admins to manage
CREATE POLICY "Admins can manage responders"
ON responders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
  )
);

-- 9. Test again
SELECT * FROM responders WHERE responder_id = 'FIRE001';

-- 10. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'responders';

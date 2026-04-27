-- Fix RLS policies for admin_profiles to allow last_seen updates

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can update their own last_seen" ON admin_profiles;

-- Create new UPDATE policy that allows admins to update their own last_seen
CREATE POLICY "Admins can update their own profile"
ON admin_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'admin_profiles'
ORDER BY cmd, policyname;

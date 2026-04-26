-- Sync existing auth users to admin_profiles table
-- This will add any missing admin profiles for users that exist in auth.users

-- First, let's see what users exist in auth.users
-- Run this in Supabase SQL Editor

-- Insert admin profiles for users that don't have them yet
-- This will skip users that already have profiles (due to UNIQUE constraint)

INSERT INTO admin_profiles (user_id, email, role)
SELECT 
  id as user_id,
  email,
  CASE 
    WHEN email LIKE '%fire%' THEN 'fire'
    WHEN email LIKE '%medical%' THEN 'medical'
    WHEN email LIKE '%crime%' THEN 'crime'
    WHEN email LIKE '%kojowallet%' THEN 'super_admin'
    ELSE 'fire' -- default role
  END as role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM admin_profiles)
AND email IS NOT NULL;

-- Show all admin profiles after sync
SELECT * FROM admin_profiles ORDER BY created_at DESC;

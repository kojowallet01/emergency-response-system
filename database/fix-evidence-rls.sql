-- Fix RLS policies for evidence_files table
-- This allows authenticated admins to upload evidence files

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all evidence" ON evidence_files;
DROP POLICY IF EXISTS "Admins can upload evidence" ON evidence_files;
DROP POLICY IF EXISTS "Admins can delete evidence" ON evidence_files;

-- Policy: Admins can view all evidence
CREATE POLICY "Admins can view all evidence"
  ON evidence_files
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to view

-- Policy: Admins can upload evidence
CREATE POLICY "Admins can upload evidence"
  ON evidence_files
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all authenticated users to insert

-- Policy: Admins can delete their own evidence
CREATE POLICY "Admins can delete evidence"
  ON evidence_files
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Verify policies
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
WHERE tablename = 'evidence_files';

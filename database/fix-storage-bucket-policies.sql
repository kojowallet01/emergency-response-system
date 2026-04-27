-- Storage Bucket Policies for evidence-files bucket
-- Run this in Supabase SQL Editor

-- First, ensure the bucket exists (you may have already created it via UI)
-- If not, create it:
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own evidence" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to evidence-files bucket
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-files'
);

-- Policy 2: Allow public read access to evidence-files bucket
CREATE POLICY "Public can view evidence"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-files'
);

-- Policy 3: Allow users to delete their own uploads
CREATE POLICY "Users can delete own evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'evidence-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to update their own uploads
CREATE POLICY "Users can update own evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidence-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'evidence-files'
);

-- Verify bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'evidence-files';

-- Verify storage policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%evidence%';

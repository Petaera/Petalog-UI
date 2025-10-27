-- Create a storage bucket for location logos
-- Run this in your Supabase SQL Editor

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create a policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload logo images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);

-- 3. Create a policy to allow authenticated users to read files
CREATE POLICY "Allow public read access to logo images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);

-- 4. Create a policy to allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update logo images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);

-- 5. Create a policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete logo images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);


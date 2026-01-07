-- Create client-logos storage bucket for customer logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for client-logos storage bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete client logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view client logos" ON storage.objects;

-- Policy: Users can upload logos to their own organization folder
CREATE POLICY "Users can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update logos in their own organization folder
CREATE POLICY "Users can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete logos from their own organization folder
CREATE POLICY "Users can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view logos from their own organization
CREATE POLICY "Users can view client logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Allow public access to client logos (for portal customers)
-- This is needed because portal customers don't have Supabase auth
CREATE POLICY "Public can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- RLS Policies for branding storage bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload org branding" ON storage.objects;
DROP POLICY IF EXISTS "Users can update org branding" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete org branding" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org branding" ON storage.objects;
DROP POLICY IF EXISTS "Public can view branding" ON storage.objects;

-- Policy: Users can upload logos to their own organization folder
CREATE POLICY "Users can upload org branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update logos in their own organization folder
CREATE POLICY "Users can update org branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete logos from their own organization folder
CREATE POLICY "Users can delete org branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view logos from their own organization
CREATE POLICY "Users can view org branding"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Allow public access to branding (for portal customers)
-- This is needed because portal customers don't have Supabase auth
CREATE POLICY "Public can view branding"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');

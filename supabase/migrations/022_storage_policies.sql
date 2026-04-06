-- ============================================================
-- STORAGE POLICIES: Per-user file access in app-files bucket
-- ============================================================
-- Each user can only access files in their own folder: {user_id}/...

-- 1. Users can view own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-files'
  AND name LIKE (auth.uid()::text || '/%')
);

-- 2. Users can upload to own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-files'
  AND name LIKE (auth.uid()::text || '/%')
);

-- 3. Users can update own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-files'
  AND name LIKE (auth.uid()::text || '/%')
);

-- 4. Users can delete own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-files'
  AND name LIKE (auth.uid()::text || '/%')
);

-- ============================================
-- VERIFY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Storage policies created for bucket "app-files"';
  RAISE NOTICE '   - Users can only access files in their own folder: {user_id}/...';
END $$;

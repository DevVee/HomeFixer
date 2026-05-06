-- ============================================================
-- FIX: Admin cannot approve/reject providers due to RLS
--
-- ROOT CAUSE:
--   The existing UPDATE policy on provider_profiles checks:
--     USING (user_id = auth.uid())
--   This means a user can only update THEIR OWN provider_profiles row.
--   When an admin (with a different uid) tries to approve/reject,
--   the policy blocks it — Supabase returns success (no error)
--   but 0 rows are updated. The status never changes in the DB.
--
-- FIX:
--   Add a separate admin UPDATE policy that allows any user
--   with role = 'admin' in profiles to update any provider_profiles row.
--
-- Also adds an admin UPDATE policy on profiles so that
-- is_verified can be set when approving/rejecting.
-- ============================================================

-- Allow admins to update any provider_profiles row
CREATE POLICY "providers_update_admin"
ON provider_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Allow admins to update any profiles row (needed for is_verified)
CREATE POLICY "profiles_update_admin"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Also allow signed URL generation for the verification-docs bucket
-- (needed for the admin to view images in the app)
-- Run this only if you don't already have a SELECT policy on storage.objects:
CREATE POLICY "storage_signed_url_auth"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-docs'
  AND auth.role() = 'authenticated'
);

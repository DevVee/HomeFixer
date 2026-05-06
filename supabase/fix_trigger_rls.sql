-- ============================================================
-- FIX: "database error saving new user" for provider accounts
-- 
-- ROOT CAUSE:
--   The handle_new_user trigger tries to insert into provider_profiles,
--   but at the time the trigger runs (AFTER INSERT on auth.users),
--   auth.uid() is NULL — there is no session yet.
--   The RLS policy "providers_insert_own" uses CHECK (user_id = auth.uid()),
--   which evaluates to (user_id = NULL) → always false → INSERT blocked → error.
--
-- FIX:
--   1. Rewrite the trigger as SECURITY DEFINER with SET search_path = public
--      so it runs as the function owner (postgres superuser) and bypasses RLS.
--   2. Update the schema.sql trigger to also insert provider_profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     TEXT;
  v_category TEXT;
BEGIN
  v_role     := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  v_category := COALESCE(NEW.raw_user_meta_data->>'service_category', 'plumbing');

  -- Insert into profiles (bypasses RLS because SECURITY DEFINER)
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- If provider, also create provider_profiles row
  IF v_role = 'provider' THEN
    INSERT INTO provider_profiles (user_id, service_category)
    VALUES (NEW.id, v_category)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

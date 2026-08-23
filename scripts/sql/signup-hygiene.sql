-- ============================================================================
-- Signup hygiene (2026-08-22)
-- Deploy ONCE: InsForge Dashboard → SQL editor.
--
-- 1) check_signup_email(p_email text) → 'none' | 'in_progress' | 'registered'
--      'none'        no auth record                              → fresh signup
--      'in_progress' auth record, unverified, no profile        → abandoned ghost;
--                                                      purgeable by re-signup
--      'registered'  users row exists OR email_verified = true → "Email already exists"
--    SECURITY DEFINER so anon-keyed routes can classify despite RLS.
--
-- 2) purge_signup_ghost(p_email text, p_min_age text DEFAULT '10 minutes') → int
--    Deletes an UNVERIFIED, profile-less auth record for the given email —
--    but only if it is older than p_min_age. The age floor makes a live
--    signup session unhijackable: an attacker typing someone's email cannot
--    purge a fresh record; genuinely abandoned ones yield to re-registration.
--
-- Schema note (verified 2026-08-22 via information_schema): InsForge's
-- auth.users uses `email_verified boolean` (NOT Supabase's
-- email_confirmed_at) plus created_at timestamptz.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_signup_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE lower(au.email) = lower(p_email)
    ) THEN 'none'
    WHEN EXISTS (
      SELECT 1 FROM public.users pu WHERE lower(pu.email) = lower(p_email)
    ) THEN 'registered'
    WHEN EXISTS (
      SELECT 1 FROM auth.users au2
      WHERE lower(au2.email) = lower(p_email)
        AND au2.email_verified = true
    ) THEN 'registered'
    ELSE 'in_progress'
  END;
$$;

CREATE OR REPLACE FUNCTION purge_signup_ghost(p_email text, p_min_age text DEFAULT '10 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM auth.users au
  WHERE lower(au.email) = lower(p_email)
    AND au.email_verified = false
    AND au.created_at < now() - p_min_age::interval
    AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

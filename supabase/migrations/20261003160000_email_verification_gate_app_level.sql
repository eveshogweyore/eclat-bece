-- Email verification is enforced app-side via the Resend code flow
-- (send-verification-email -> verify-email-code), which flips
-- profiles.email_verified. With Supabase's built-in "Confirm email" disabled,
-- email_confirmed_at is set at signup, so deriving the profile flag from it
-- made every new account "verified" before any code was entered. New accounts
-- now start unverified; the OAuth callback and the provisioning functions set
-- the flag explicitly for their flows.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    false
  );
  RETURN NEW;
END;
$$;

-- One-time backfill: every account created before this migration predates the
-- app-level gate and was verified through the old flow (or provisioned
-- confirmed). New accounts are created false by the trigger above and must
-- pass the Resend code flow, so this statement never regresses them.
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false;

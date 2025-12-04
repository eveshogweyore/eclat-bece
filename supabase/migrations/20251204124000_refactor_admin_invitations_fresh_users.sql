-- Migration to update admin_invitations for fresh users only
-- This changes the table to store email instead of user_id

-- Step 1: Add target_email column
ALTER TABLE public.admin_invitations 
  ADD COLUMN IF NOT EXISTS target_email TEXT;

-- Step 2: Migrate existing data (if any)
UPDATE public.admin_invitations 
SET target_email = (
  SELECT email FROM public.profiles WHERE id = target_user_id
)
WHERE target_email IS NULL AND target_user_id IS NOT NULL;

-- Step 3: Drop the old column and constraint
ALTER TABLE public.admin_invitations 
  DROP COLUMN IF EXISTS target_user_id CASCADE;

-- Step 4: Make target_email NOT NULL
ALTER TABLE public.admin_invitations 
  ALTER COLUMN target_email SET NOT NULL;

-- Step 5: Add index on target_email
CREATE INDEX IF NOT EXISTS idx_admin_invitations_target_email 
  ON public.admin_invitations(target_email);

-- Step 6: Drop old accept function
DROP FUNCTION IF EXISTS public.accept_admin_invitation(TEXT);

-- Step 7: Create new function to create admin user from invitation
CREATE OR REPLACE FUNCTION public.create_admin_from_invitation(
  _token TEXT,
  _password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  new_user_id UUID;
  new_admin_id UUID;
  result JSONB;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM admin_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Check if email already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE email = invitation_record.target_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email already registered'
    );
  END IF;

  -- Note: User creation with password must be done via Edge Function
  -- This function will be called AFTER user is created
  -- For now, return invitation details for Edge Function to use
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'email', invitation_record.target_email,
      'full_name', invitation_record.full_name,
      'is_super_admin', invitation_record.is_super_admin,
      'invited_by', invitation_record.invited_by
    )
  );
END;
$$;

-- Step 8: Create function to finalize admin creation (called by Edge Function after user creation)
CREATE OR REPLACE FUNCTION public.finalize_admin_creation(
  _invitation_id UUID,
  _user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  new_admin_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM admin_invitations
  WHERE id = _invitation_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Add admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create admin record
  INSERT INTO admins (
    user_id,
    full_name,
    is_super_admin,
    created_by,
    is_active
  )
  VALUES (
    _user_id,
    invitation_record.full_name,
    invitation_record.is_super_admin,
    invitation_record.invited_by,
    TRUE
  )
  RETURNING id INTO new_admin_id;

  -- Update invitation status
  UPDATE admin_invitations
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = _invitation_id;

  -- Log the acceptance
  PERFORM log_admin_action(
    invitation_record.invited_by,
    'accept_invitation',
    'admin',
    new_admin_id,
    jsonb_build_object(
      'invitation_id', _invitation_id,
      'new_admin_id', new_admin_id,
      'is_super_admin', invitation_record.is_super_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'admin_id', new_admin_id,
    'is_super_admin', invitation_record.is_super_admin
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_admin_from_invitation(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.finalize_admin_creation(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.create_admin_from_invitation(TEXT, TEXT) IS 'Validates invitation and returns details for Edge Function to create user';
COMMENT ON FUNCTION public.finalize_admin_creation(UUID, UUID) IS 'Finalizes admin creation after user is created by Edge Function';

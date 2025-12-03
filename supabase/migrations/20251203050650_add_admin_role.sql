-- Add admin role to the platform
-- This migration creates the admin role and related tables for managing the platform

-- Add 'admin' value to the app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  permissions JSONB DEFAULT '{"canManageUsers": true, "canManageQuestions": true, "canViewAnalytics": true, "canManageCompetitions": true}'::jsonb,
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admin_audit_log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on admin tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_is_super_admin ON public.admins(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource_type ON public.admin_audit_log(resource_type);

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = _user_id
      AND is_active = TRUE
  )
$$;

-- Helper function to check if a user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = _user_id
      AND is_super_admin = TRUE
      AND is_active = TRUE
  )
$$;

-- Helper function to get admin ID from user ID
CREATE OR REPLACE FUNCTION public.get_admin_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.admins WHERE user_id = _user_id AND is_active = TRUE
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _admin_id UUID,
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, resource_type, resource_id, details)
  VALUES (_admin_id, _action, _resource_type, _resource_id, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_admin_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for admins table
CREATE TRIGGER set_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_updated_at();

-- RLS Policies for admins table

-- Admins can view their own record
CREATE POLICY "Admins can view own record"
  ON public.admins FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all admin records
CREATE POLICY "Super admins can view all admins"
  ON public.admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
        AND is_active = TRUE
    )
  );

-- Super admins can insert new admins
CREATE POLICY "Super admins can insert admins"
  ON public.admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
        AND is_active = TRUE
    )
  );

-- Super admins can update admin records
CREATE POLICY "Super admins can update admins"
  ON public.admins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
        AND is_active = TRUE
    )
  );

-- Super admins can delete admins (soft delete recommended)
CREATE POLICY "Super admins can delete admins"
  ON public.admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
        AND is_active = TRUE
    )
  );

-- RLS Policies for admin_audit_log table

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

-- Only the system can insert audit logs (via log_admin_action function)
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (TRUE);

-- Comment on tables and important columns
COMMENT ON TABLE public.admins IS 'Stores admin user information and permissions';
COMMENT ON TABLE public.admin_audit_log IS 'Tracks all administrative actions for security and compliance';
COMMENT ON COLUMN public.admins.permissions IS 'JSONB object containing granular admin permissions';
COMMENT ON COLUMN public.admins.is_super_admin IS 'Super admins can manage other admins and access all features';
COMMENT ON COLUMN public.admins.created_by IS 'References the admin who created this admin account';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.admins TO authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

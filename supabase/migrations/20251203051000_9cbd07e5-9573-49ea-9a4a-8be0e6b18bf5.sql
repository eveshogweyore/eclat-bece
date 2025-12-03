-- Drop the problematic recursive policies on admins table
DROP POLICY IF EXISTS "Super admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Super admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Super admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "Super admins can delete admins" ON public.admins;

-- Recreate policies using the SECURITY DEFINER functions to avoid recursion
-- Admins can view their own record (this one is fine, no recursion)
-- Already exists: "Admins can view own record" with (auth.uid() = user_id)

-- Super admins can view all admin records
CREATE POLICY "Super admins can view all admins"
ON public.admins
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert new admin records
CREATE POLICY "Super admins can insert admins"
ON public.admins
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can update admin records
CREATE POLICY "Super admins can update admins"
ON public.admins
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Super admins can delete admin records
CREATE POLICY "Super admins can delete admins"
ON public.admins
FOR DELETE
USING (public.is_super_admin(auth.uid()));
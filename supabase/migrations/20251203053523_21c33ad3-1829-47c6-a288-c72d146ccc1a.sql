-- Fix 1: Notifications INSERT policy - restrict to parents and students only
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Parents and students can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Parents can create notifications (for child link requests)
  EXISTS (SELECT 1 FROM parents WHERE parents.user_id = auth.uid())
  OR
  -- Students can create notifications (for accepting requests)
  EXISTS (SELECT 1 FROM students WHERE students.user_id = auth.uid())
);

-- Fix 2: Audit log INSERT policy - restrict to admins only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

CREATE POLICY "Only admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Fix 3: Add failed_attempts column for brute force protection
ALTER TABLE public.email_verification_codes
ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0;
-- log_admin_action and update_student_streak had no internal authorization:
-- any signed-in user could forge audit entries or advance any student's
-- streak. The originals become private *_impl functions; the public names
-- become guarded wrappers (active admin / service_role for audit; owner or
-- service_role for streak).

ALTER FUNCTION public.log_admin_action(uuid, text, text, uuid, jsonb) RENAME TO log_admin_action_impl;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _admin_id uuid, _action text, _resource_type text, _resource_id uuid, _details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND NOT COALESCE(public.is_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Only administrators can write audit entries';
  END IF;
  PERFORM public.log_admin_action_impl(_admin_id, _action, _resource_type, _resource_id, _details);
END;
$$;

ALTER FUNCTION public.update_student_streak(uuid) RENAME TO update_student_streak_impl;

CREATE OR REPLACE FUNCTION public.update_student_streak(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'Not permitted to update this student''s streak';
  END IF;
  PERFORM public.update_student_streak_impl(p_student_id);
END;
$$;

-- The rename carried the old grants onto the impl functions; lock them down
-- so only the guarded wrappers are reachable.
REVOKE ALL ON FUNCTION public.log_admin_action_impl(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_student_streak_impl(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_student_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_student_streak(uuid) TO authenticated, service_role;

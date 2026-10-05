-- Fix update_pinned_badges parameter type.
--
-- Badge ids are text slugs from INITIAL_18_BADGES (e.g. 'first_step',
-- 'sharp_shooter') and student_gamification_profile.pinned_badge_ids is a
-- text[] column. The RPC-surface-hardening migration declared the parameter
-- as uuid[], so every student call failed in PostgREST with
-- "invalid input syntax for type uuid" (22P02), surfacing in the UI as
-- "Failed to update badge showcase".
--
-- CREATE OR REPLACE cannot change an argument type, so the uuid[] overload is
-- dropped first to keep a single unambiguous RPC for PostgREST.

DROP FUNCTION IF EXISTS public.update_pinned_badges(p_badge_ids uuid[]);

CREATE OR REPLACE FUNCTION public.update_pinned_badges(p_badge_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  UPDATE public.student_gamification_profile
  SET pinned_badge_ids = p_badge_ids,
      updated_at = now()
  WHERE student_id = v_student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_pinned_badges(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pinned_badges(text[]) TO authenticated;

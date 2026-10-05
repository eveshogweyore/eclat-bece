-- Badge showcase integrity fixes.
--
-- 1. The RLS lockdown migration (20261002230000_server_authoritative_scoring_
--    phase_b_rls_lockdown.sql) never reached this project, so students could
--    still INSERT their own student_badges rows and self-award any badge,
--    which then counts as earned in the showcase and gallery. Badges are
--    awarded by the server pipeline only.
DROP POLICY IF EXISTS "Students can insert own badges"
  ON public.student_badges;

-- 2. update_pinned_badges accepted any text array: no length cap, no dedupe,
--    and no check that the badges were actually earned. A student could pin
--    unearned badges (or any number of entries) into their showcase. NULL
--    slots are permitted so a pin keeps the exact slot position it was given.
CREATE OR REPLACE FUNCTION public.update_pinned_badges(p_badge_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_pinned_count integer;
  v_distinct_count integer;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  SELECT count(*), count(DISTINCT b.id)
  INTO v_pinned_count, v_distinct_count
  FROM unnest(p_badge_ids) AS b(id)
  WHERE b.id IS NOT NULL;

  IF v_pinned_count > 5 THEN
    RAISE EXCEPTION 'Showcase holds at most 5 badges';
  END IF;

  IF v_pinned_count <> v_distinct_count THEN
    RAISE EXCEPTION 'A badge cannot occupy two showcase slots';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_badge_ids) AS b(id)
    WHERE b.id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.student_badges sb
        WHERE sb.student_id = v_student_id
          AND sb.badge_id = b.id
      )
  ) THEN
    RAISE EXCEPTION 'Badge not earned yet';
  END IF;

  UPDATE public.student_gamification_profile
  SET pinned_badge_ids = p_badge_ids,
      updated_at = now()
  WHERE student_id = v_student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_pinned_badges(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pinned_badges(text[]) TO authenticated;

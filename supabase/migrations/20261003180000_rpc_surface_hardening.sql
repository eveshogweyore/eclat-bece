-- Phase 2 database hardening: close the unauthenticated RPC surface, scope
-- notification inserts, and close the client-side EP self-award paths.

-- 1. SECURITY DEFINER functions: EXECUTE is PUBLIC by default, so the whole
--    set was callable with just the anon key. Keep public access only for the
--    pre-auth flows that need it (public leaderboard, school-code lookup,
--    admin invitation setup); everything else becomes authenticated-only.
REVOKE EXECUTE ON FUNCTION public.auto_merge_all_exact_duplicates(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_duplicate_question_clusters(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_subject_safe(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_practice_assignment_rules() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_student_self_update_rules() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expire_old_invitations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_duplicate_question_clusters(text, text, text, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invitation_token() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_subjects_with_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_unique_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_student_gamification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_quiz_completion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ignore_duplicate_cluster(text, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ignore_duplicate_question_pair(text, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rename_subject_cascade(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_weekly_league_cohorts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_duplicate_questions(text, uuid, uuid[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_quiz_session(text, uuid[], text, text, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_duel_turn(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_answer(uuid, uuid, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_student_streak(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_teacher_class_ownership() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_student_points_ledger() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_admin_creation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_details(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_arena_challenge(uuid, uuid, text, text, text, integer, uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_quiz_session(text, uuid[], text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answer(uuid, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_unique_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_duplicate_question_clusters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_question_clusters(text, text, text, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_duplicate_questions(text, uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_merge_all_exact_duplicates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ignore_duplicate_cluster(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ignore_duplicate_question_pair(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subject_safe(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_subject_cascade(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_subjects_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_old_invitations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_weekly_league_cohorts() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_student_points_ledger() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_student_streak(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_teacher_class_ownership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_arena_challenge(uuid, uuid, text, text, text, integer, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_admin_creation(uuid, uuid) TO authenticated;

-- 2. Notifications: any parent/student could previously insert a notification
--    into ANY recipient's inbox (spoofed "Parent Link Request" phishing).
--    Now: self, parent -> own child, or child -> own linked parent.
DROP POLICY IF EXISTS "Parents and students can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications for themselves or their links"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.parents pa ON pa.id = s.parent_id
      WHERE s.user_id = notifications.user_id
        AND pa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.parents pa ON pa.id = s.parent_id
      WHERE s.user_id = auth.uid()
        AND pa.user_id = notifications.user_id
    )
  );

-- 3. Close the client-side EP self-award paths: quiz EP is written by the
--    server-authoritative pipeline, so students no longer insert ledger rows
--    or update their own gamification profile directly. Pinned badges move to
--    a scoped RPC below (pinned_badge_ids was the only legitimate self-write).
DROP POLICY IF EXISTS "Students can insert own points ledger" ON public.student_points_ledger;
DROP POLICY IF EXISTS "Students can update own gamification profile" ON public.student_gamification_profile;
DROP POLICY IF EXISTS "Students can insert own gamification profile" ON public.student_gamification_profile;

CREATE OR REPLACE FUNCTION public.update_pinned_badges(p_badge_ids uuid[])
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

REVOKE EXECUTE ON FUNCTION public.update_pinned_badges(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pinned_badges(uuid[]) TO authenticated;

-- 4. Pin the search_path on the functions the security linter flagged.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_admin_updated_at', 'generate_invitation_token', 'expire_old_invitations',
        'get_required_ep_for_level', 'calculate_level_from_ep'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.fn);
  END LOOP;
END $$;

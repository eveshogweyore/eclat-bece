-- Abandoned quiz sessions: quitting mid-quiz previously left sessions
-- "in_progress" forever. Students can now explicitly abandon their own
-- session; the server-authoritative pipeline (complete-quiz-session) still
-- owns all grading/EP paths and is unaffected.
CREATE OR REPLACE FUNCTION public.abandon_quiz_session(p_session_id uuid)
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

  UPDATE public.quiz_sessions
  SET status = 'abandoned'
  WHERE id = p_session_id
    AND student_id = v_student_id
    AND status = 'in_progress';

  -- No-op when the session was not found, already completed, or not owned:
  -- those cases are meaningless to abandon and must not leak information.
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abandon_quiz_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_quiz_session(uuid) TO authenticated;

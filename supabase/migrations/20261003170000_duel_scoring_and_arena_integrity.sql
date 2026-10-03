-- Duel/Arena integrity: score duels from server-recorded answers instead of a
-- client-supplied number, validate challenge creation, and lock the RPCs down
-- to authenticated students.

-- ---------------------------------------------------------------------------
-- 1. submit_duel_turn — the score is computed from quiz_session_answers for a
-- session that must belong to the caller and to this challenge and be
-- completed; the time is measured server-side from the session window. The
-- old p_score/p_time_taken_seconds parameters let a modified client post any
-- result into the EP/league economy. Re-submitting is idempotent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_duel_turn(
  p_challenge_id uuid,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_student public.students;
  v_challenge public.arena_challenges;
  v_session public.quiz_sessions;
  v_is_challenger boolean;
  v_is_opponent boolean;
  v_score integer;
  v_time_taken integer;
  v_winner_id uuid := NULL;
  v_caller_ep integer := 0;
  v_outcome text;
  v_upset_bonus integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  SELECT * INTO v_challenge FROM public.arena_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  v_is_challenger := v_challenge.challenger_id = v_student.id;
  v_is_opponent := v_challenge.opponent_id = v_student.id;
  IF NOT (v_is_challenger OR v_is_opponent) THEN
    RAISE EXCEPTION 'Not a participant of this challenge';
  END IF;
  IF v_challenge.status = 'completed' THEN
    RAISE EXCEPTION 'Challenge already completed';
  END IF;

  -- Idempotency: if the caller's turn is already recorded, return the stored
  -- state without re-recording or re-awarding EP.
  IF (v_is_challenger AND v_challenge.challenger_score IS NOT NULL)
     OR (v_is_opponent AND v_challenge.opponent_score IS NOT NULL) THEN
    IF v_challenge.status = 'completed' THEN
      v_outcome := CASE
        WHEN v_challenge.winner_id IS NULL THEN 'draw'
        WHEN v_challenge.winner_id = v_student.id THEN 'win'
        ELSE 'loss'
      END;
      v_caller_ep := CASE WHEN v_is_challenger THEN v_challenge.challenger_ep ELSE v_challenge.opponent_ep END;
      RETURN jsonb_build_object('status', 'completed', 'resolved', true, 'outcome', v_outcome, 'ep_awarded', v_caller_ep);
    END IF;
    RETURN jsonb_build_object('status', v_challenge.status, 'resolved', false);
  END IF;

  -- The turn must reference the caller's own completed session for this duel.
  SELECT * INTO v_session FROM public.quiz_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz session not found';
  END IF;
  IF v_session.student_id <> v_student.id THEN
    RAISE EXCEPTION 'Session does not belong to this student';
  END IF;
  IF v_session.arena_challenge_id IS DISTINCT FROM p_challenge_id THEN
    RAISE EXCEPTION 'Session does not belong to this challenge';
  END IF;
  IF v_session.status <> 'completed' OR v_session.completed_at IS NULL THEN
    RAISE EXCEPTION 'Quiz session is not completed';
  END IF;

  -- Score and duration come from the server record, never the client.
  SELECT count(*) INTO v_score
  FROM public.quiz_session_answers
  WHERE session_id = p_session_id AND is_correct;

  v_time_taken := GREATEST(0, EXTRACT(EPOCH FROM (v_session.completed_at - v_session.started_at))::integer);

  -- Record the caller's turn
  IF v_is_challenger THEN
    UPDATE public.arena_challenges
    SET challenger_score = v_score,
        challenger_time_taken = v_time_taken,
        status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END
    WHERE id = p_challenge_id;
  ELSE
    UPDATE public.arena_challenges
    SET opponent_score = v_score,
        opponent_time_taken = v_time_taken,
        status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END
    WHERE id = p_challenge_id;
  END IF;

  -- If both turns are in, resolve the duel server-side
  SELECT * INTO v_challenge FROM public.arena_challenges WHERE id = p_challenge_id;
  IF v_challenge.challenger_score IS NULL OR v_challenge.opponent_score IS NULL THEN
    RETURN jsonb_build_object('status', v_challenge.status, 'resolved', false);
  END IF;

  -- Winner: higher score; tie broken by faster time
  IF v_challenge.challenger_score > v_challenge.opponent_score
     OR (v_challenge.challenger_score = v_challenge.opponent_score
         AND COALESCE(v_challenge.challenger_time_taken, 0) < COALESCE(v_challenge.opponent_time_taken, 0)) THEN
    v_winner_id := v_challenge.challenger_id;
  ELSIF v_challenge.opponent_score > v_challenge.challenger_score
     OR (v_challenge.opponent_score = v_challenge.challenger_score
         AND COALESCE(v_challenge.opponent_time_taken, 0) < COALESCE(v_challenge.challenger_time_taken, 0)) THEN
    v_winner_id := v_challenge.opponent_id;
  END IF;

  IF v_winner_id IS NULL THEN
    v_outcome := 'draw';
    v_caller_ep := 20; -- draw reward (arenaEngine ARENA_BASE_REWARDS)
  ELSIF v_winner_id = v_student.id THEN
    v_outcome := 'win';
    v_caller_ep := 50; -- win reward
    -- Upset bonus: beating a higher-tier opponent
    IF EXISTS (
      SELECT 1
      FROM public.student_gamification_profile winner_p, public.student_gamification_profile loser_p
      WHERE winner_p.student_id = v_student.id
        AND loser_p.student_id = (CASE WHEN v_winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id ELSE v_challenge.challenger_id END)
        AND winner_p.current_league_tier < loser_p.current_league_tier
    ) THEN
      v_upset_bonus := 25;
      v_caller_ep := v_caller_ep + v_upset_bonus;
    END IF;
  ELSE
    v_outcome := 'loss';
    v_caller_ep := 5; -- participation reward
  END IF;

  UPDATE public.arena_challenges
  SET winner_id = v_winner_id,
      status = 'completed',
      completed_at = now(),
      challenger_ep = CASE
        WHEN v_winner_id IS NULL THEN 20
        WHEN v_winner_id = challenger_id THEN 50 + v_upset_bonus
        ELSE 5 END,
      opponent_ep = CASE
        WHEN v_winner_id IS NULL THEN 20
        WHEN v_winner_id = opponent_id THEN 50 + v_upset_bonus
        ELSE 5 END
  WHERE id = p_challenge_id;

  -- Award the caller's EP through the ledger + profile + cohort (server-side)
  INSERT INTO public.student_points_ledger (student_id, amount, source_type, reference_id, metadata)
  VALUES (
    v_student.id,
    v_caller_ep,
    'duel',
    p_challenge_id,
    jsonb_build_object('outcome', v_outcome, 'score', v_score, 'upset_bonus', v_upset_bonus)
  );

  UPDATE public.student_gamification_profile
  SET lifetime_ep = lifetime_ep + v_caller_ep,
      weekly_ep = weekly_ep + v_caller_ep
  WHERE student_id = v_student.id;

  PERFORM public.assign_student_to_weekly_cohort(v_student.id);
  PERFORM public.update_student_cohort_points(v_student.id, v_caller_ep);

  RETURN jsonb_build_object(
    'status', 'completed',
    'resolved', true,
    'outcome', v_outcome,
    'ep_awarded', v_caller_ep,
    'upset_bonus', v_upset_bonus
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_duel_turn(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_duel_turn(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. create_arena_challenge — validate the challenge actually refers to real,
-- cohort-matched questions and a same-cohort opponent. Previously any caller
-- could mint a duel with an empty or foreign question set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_arena_challenge(
  p_challenger_id uuid,
  p_opponent_id uuid,
  p_challenge_name text,
  p_subject text,
  p_topic text,
  p_max_time_seconds integer,
  p_question_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id uuid;
  v_challenger_class_year text;
  v_missing integer;
BEGIN
  IF p_challenger_id IS NULL OR p_opponent_id IS NULL OR p_challenger_id = p_opponent_id THEN
    RAISE EXCEPTION 'Invalid duel participants';
  END IF;

  IF COALESCE(array_length(p_question_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'A duel needs at least one question';
  END IF;

  SELECT class_year INTO v_challenger_class_year
  FROM public.students WHERE id = p_challenger_id;
  IF v_challenger_class_year IS NULL THEN
    RAISE EXCEPTION 'Challenger has no class year';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_opponent_id AND class_year = v_challenger_class_year
  ) THEN
    RAISE EXCEPTION 'Opponent must be in the same class year as the challenger';
  END IF;

  IF v_challenger_class_year = 'year_9' THEN
    SELECT count(*) INTO v_missing
    FROM unnest(p_question_ids) AS qid
    WHERE NOT EXISTS (SELECT 1 FROM public.quiz_questions_year9 q WHERE q.id = qid);
  ELSE
    SELECT count(*) INTO v_missing
    FROM unnest(p_question_ids) AS qid
    WHERE NOT EXISTS (SELECT 1 FROM public.quiz_questions_year6 q WHERE q.id = qid);
  END IF;
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Challenge questions must belong to the challenger''s class year';
  END IF;

  INSERT INTO public.arena_challenges (
    challenger_id,
    opponent_id,
    challenge_name,
    subject,
    topic,
    max_time_seconds,
    question_ids,
    status
  ) VALUES (
    p_challenger_id,
    p_opponent_id,
    COALESCE(NULLIF(trim(p_challenge_name), ''), 'Head-to-Head Duel'),
    p_subject,
    p_topic,
    GREATEST(30, COALESCE(p_max_time_seconds, 300)),
    p_question_ids,
    'pending'
  )
  RETURNING id INTO v_challenge_id;

  RETURN v_challenge_id;
END;
$$;

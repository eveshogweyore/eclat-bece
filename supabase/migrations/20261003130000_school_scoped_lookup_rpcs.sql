-- Scoped replacements for reads that previously leaned on the dropped
-- "Authenticated users can view all ..." policies, plus a correction to the
-- student self-update guard: first-time parent linking by code must keep
-- working, so NULL -> parent_id transitions stay allowed for the student
-- (re-parenting and school/class changes remain blocked).

CREATE OR REPLACE FUNCTION public.enforce_student_self_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.class_year IS DISTINCT FROM OLD.class_year
      OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
      OR NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed
      OR NEW.school_id IS DISTINCT FROM OLD.school_id
      OR NEW.class_id IS DISTINCT FROM OLD.class_id
      OR (
        NEW.parent_id IS DISTINCT FROM OLD.parent_id
        AND NOT (OLD.parent_id IS NULL AND NEW.parent_id IS NOT NULL)
      ) THEN
      RAISE EXCEPTION 'Students cannot update protected account fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Platform rank for the student dashboard's "Top 10%" badge and monthly rank.
-- Replaces platform-wide quiz_results/students/profiles reads; callers get
-- only their own standing.
CREATE OR REPLACE FUNCTION public.get_platform_student_rank()
RETURNS TABLE (score_rank integer, score_total integer, points_rank integer, points_total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT s.id AS sid
    FROM public.students s
    WHERE s.user_id = auth.uid()
  ),
  month_results AS (
    SELECT r.student_id, r.score, r.correct_answers
    FROM public.quiz_results r
    WHERE r.completed_at >= date_trunc('month', now())
  ),
  score_board AS (
    SELECT student_id, avg(score) AS avg_score
    FROM month_results
    GROUP BY student_id
  ),
  score_ranked AS (
    SELECT student_id,
           rank() OVER (ORDER BY avg_score DESC, student_id) AS rnk,
           count(*) OVER () AS total
    FROM score_board
  ),
  points_board AS (
    SELECT s.id AS student_id,
           COALESCE(sum(r.correct_answers), 0) * 100 AS pts
    FROM public.students s
    LEFT JOIN month_results r ON r.student_id = s.id
    GROUP BY s.id
  ),
  points_ranked AS (
    SELECT pb.student_id,
           rank() OVER (
             ORDER BY pb.pts DESC,
                      COALESCE(pf.full_name, pf.username, '') ASC,
                      pb.student_id
           ) AS rnk,
           (SELECT count(*) FROM public.students) AS total
    FROM points_board pb
    LEFT JOIN public.students ms ON ms.id = pb.student_id
    LEFT JOIN public.profiles pf ON pf.id = ms.user_id
  )
  SELECT
    sr.rnk::integer,
    sr.total::integer,
    pr.rnk::integer,
    pr.total::integer
  FROM me
  LEFT JOIN score_ranked sr ON sr.student_id = me.sid
  LEFT JOIN points_ranked pr ON pr.student_id = me.sid
$$;

-- Opponent discovery for Duel of Minds. Replaces platform-wide student/profile
-- listings (which also had a broken profiles.id join and never returned
-- results). Same-grade only, derived from the caller's own record.
CREATE OR REPLACE FUNCTION public.search_duel_opponents(
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (id uuid, full_name text, username text, school_name text, class_year text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT s.class_year AS my_year
    FROM public.students s
    WHERE s.user_id = auth.uid()
  ),
  needle AS (
    SELECT replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') AS pattern
  )
  SELECT s.id, pf.full_name, pf.username, sc.school_name, s.class_year
  FROM public.students s
  JOIN public.profiles pf ON pf.id = s.user_id
  LEFT JOIN public.schools sc ON sc.id = s.school_id
  CROSS JOIN me
  CROSS JOIN needle
  WHERE s.user_id <> auth.uid()
    AND s.class_year = me.my_year
    AND (
      needle.pattern = ''
      OR pf.full_name ILIKE '%' || needle.pattern || '%'
      OR pf.username ILIKE '%' || needle.pattern || '%'
    )
  ORDER BY pf.full_name ASC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 200)
$$;

-- Child linking: parent searches a student by their code/username. Returns at
-- most one, minimal columns, exact match preferred over prefix.
CREATE OR REPLACE FUNCTION public.lookup_student_by_code(p_query text)
RETURNS TABLE (
  student_id uuid,
  user_id uuid,
  full_name text,
  username text,
  unique_id text,
  class_year text,
  parent_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT trim(p_query) AS exact
  ),
  needle AS (
    SELECT replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') AS pattern
  )
  SELECT s.id, s.user_id, pf.full_name, pf.username, pf.unique_id, s.class_year, s.parent_id
  FROM public.profiles pf
  JOIN public.students s ON s.user_id = pf.id
  CROSS JOIN q
  CROSS JOIN needle
  WHERE pf.unique_id = q.exact
     OR pf.username = lower(q.exact)
     OR (needle.pattern <> '' AND (
           pf.unique_id ILIKE needle.pattern || '%'
           OR pf.username ILIKE needle.pattern || '%'
         ))
  ORDER BY (pf.unique_id = q.exact OR pf.username = lower(q.exact)) DESC, pf.username ASC
  LIMIT 1
$$;

-- Student connects to a parent by the parent's code.
CREATE OR REPLACE FUNCTION public.lookup_parent_by_code(p_code text)
RETURNS TABLE (parent_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, pf.full_name
  FROM public.profiles pf
  JOIN public.parents p ON p.user_id = pf.id
  WHERE upper(pf.unique_id) = upper(trim(p_code))
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_platform_student_rank() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_duel_opponents(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_student_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_parent_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_student_rank() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_duel_opponents(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_student_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_parent_by_code(text) TO authenticated;

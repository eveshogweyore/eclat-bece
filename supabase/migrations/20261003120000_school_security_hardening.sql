-- School portal security hardening.
-- Closes cross-tenant reads, cross-school assignment injection, student
-- self-enrollment, and the unauthenticated cohort-RPC bypass; adds the missing
-- schools UPDATE policy and converges the school_classes schema definitions.

-- 1. Close cross-tenant reads. Any authenticated principal (including students
--    and other schools' staff) could read every student, profile, and quiz
--    result. Scoped policies (self / parent / school / admin) already exist on
--    all three tables and cover every in-app read path.
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view all quiz results" ON public.quiz_results;

-- 2. Schools can update their own record. Without this, the school settings
--    dialog's UPDATE silently matched zero rows.
DROP POLICY IF EXISTS "Schools can update own record" ON public.schools;
CREATE POLICY "Schools can update own record"
  ON public.schools FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Students must not be able to re-tenant themselves. The self-update guard
--    previously protected account fields only; school_id/parent_id/class_id
--    were freely editable from the student's own session.
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
      OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
      OR NEW.class_id IS DISTINCT FROM OLD.class_id THEN
      RAISE EXCEPTION 'Students cannot update protected account fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Assignments: a school may only assign to its own students, and a
--    school-provisioned student (no parent) must be assignable at all. The old
--    trigger always required a parent, so the school flow failed for exactly
--    its primary population while cross-school student_ids passed unchecked.
CREATE OR REPLACE FUNCTION public.enforce_practice_assignment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_is_premium BOOLEAN;
  v_student_user_id UUID;
  v_student_school_id UUID;
BEGIN
  IF COALESCE(array_length(NEW.topics, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one topic is required';
  END IF;

  SELECT parent_id, is_premium, user_id, school_id
  INTO v_parent_id, v_is_premium, v_student_user_id, v_student_school_id
  FROM public.students
  WHERE id = NEW.student_id;

  IF TG_OP = 'UPDATE' AND auth.uid() = v_student_user_id THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
      OR NEW.subject IS DISTINCT FROM OLD.subject
      OR NEW.topics IS DISTINCT FROM OLD.topics
      OR NEW.num_questions IS DISTINCT FROM OLD.num_questions
      OR NEW.duration IS DISTINCT FROM OLD.duration THEN
      RAISE EXCEPTION 'Students can only update assignment progress fields';
    END IF;

    IF NEW.status NOT IN ('in_progress', 'completed') THEN
      RAISE EXCEPTION 'Students can only mark assignments as in progress or completed';
    END IF;
  END IF;

  IF NEW.school_id IS NOT NULL THEN
    -- School assignment: the school must own the selected student.
    IF v_student_school_id IS NULL OR v_student_school_id <> NEW.school_id THEN
      RAISE EXCEPTION 'Assignment school must own the selected student';
    END IF;
  ELSE
    -- Parent assignment: the parent must own the selected student.
    IF v_parent_id IS NULL OR v_parent_id <> NEW.parent_id THEN
      RAISE EXCEPTION 'Assignment parent must own the selected student';
    END IF;
  END IF;

  IF COALESCE(v_is_premium, false) = false AND NEW.num_questions > 10 THEN
    RAISE EXCEPTION 'Standard student accounts are limited to 10 questions per assignment';
  END IF;

  IF NEW.num_questions > 60 THEN
    RAISE EXCEPTION 'Assignments cannot exceed 60 questions';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Cohort RPCs: the old guard skipped every check when auth.uid() was NULL,
--    which was meant as a service-role path but equally admits unauthenticated
--    anon-key callers. Require the service_role JWT claim explicitly.
CREATE OR REPLACE FUNCTION public.assign_student_to_weekly_cohort(p_student_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier integer;
  v_week_start date;
  v_cohort_id uuid;
  v_cohort_num integer;
  v_user_id uuid := auth.uid();
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    -- Only the owning student (or an admin) may assign the cohort.
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT COALESCE(public.is_admin(v_user_id), false) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Not permitted to assign cohort for this student';
      END IF;
    END IF;
  END IF;

  v_week_start := date_trunc('week', now() AT TIME ZONE 'utc')::date;

  SELECT c.id INTO v_cohort_id
  FROM public.league_cohort_members m
  JOIN public.league_cohorts c ON c.id = m.cohort_id
  WHERE m.student_id = p_student_id
    AND c.week_start_date = v_week_start
  LIMIT 1;

  IF v_cohort_id IS NOT NULL THEN
    RETURN v_cohort_id;
  END IF;

  SELECT COALESCE(current_league_tier, 1) INTO v_tier
  FROM public.student_gamification_profile
  WHERE student_id = p_student_id;
  IF v_tier IS NULL THEN
    v_tier := 1;
  END IF;

  SELECT c.id INTO v_cohort_id
  FROM public.league_cohorts c
  WHERE c.league_tier = v_tier
    AND c.week_start_date = v_week_start
    AND (
      SELECT count(*) FROM public.league_cohort_members cm WHERE cm.cohort_id = c.id
    ) < 30
  ORDER BY c.cohort_number ASC
  LIMIT 1;

  IF v_cohort_id IS NULL THEN
    SELECT COALESCE(MAX(cohort_number), 0) + 1 INTO v_cohort_num
    FROM public.league_cohorts
    WHERE league_tier = v_tier
      AND week_start_date = v_week_start;

    INSERT INTO public.league_cohorts (league_tier, week_start_date, cohort_number)
    VALUES (v_tier, v_week_start, v_cohort_num)
    RETURNING id INTO v_cohort_id;
  END IF;

  INSERT INTO public.league_cohort_members (cohort_id, student_id, weekly_points)
  VALUES (
    v_cohort_id,
    p_student_id,
    COALESCE((
      SELECT weekly_ep FROM public.student_gamification_profile WHERE student_id = p_student_id
    ), 0)
  )
  ON CONFLICT (cohort_id, student_id) DO NOTHING;

  RETURN v_cohort_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_cohort_points(
  p_student_id uuid,
  p_additional_ep integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    -- Only admins or the owning student may adjust cohort points.
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT COALESCE(public.is_admin(v_user_id), false)
       AND NOT EXISTS (
         SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = v_user_id
       ) THEN
      RAISE EXCEPTION 'Not permitted to update cohort points for this student';
    END IF;
  END IF;

  v_cohort_id := public.assign_student_to_weekly_cohort(p_student_id);

  UPDATE public.league_cohort_members
  SET weekly_points = weekly_points + p_additional_ep
  WHERE cohort_id = v_cohort_id
    AND student_id = p_student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_student_to_weekly_cohort(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_student_cohort_points(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_student_league_cohort(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_student_to_weekly_cohort(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_student_cohort_points(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_league_cohort(uuid) TO authenticated, service_role;

-- 6. Classes referenced by exams/students/teachers must belong to the same
--    school; previously any class id (any school's, or dangling) was accepted.
DROP POLICY IF EXISTS "Schools can insert own exams" ON public.school_exams;
CREATE POLICY "Schools can insert own exams"
  ON public.school_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (SELECT id FROM public.schools WHERE user_id = auth.uid())
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.school_classes c
        WHERE c.id = school_exams.class_id AND c.school_id = school_exams.school_id
      )
    )
  );

DROP POLICY IF EXISTS "Schools can update own exams" ON public.school_exams;
CREATE POLICY "Schools can update own exams"
  ON public.school_exams FOR UPDATE
  TO authenticated
  USING (school_id IN (SELECT id FROM public.schools WHERE user_id = auth.uid()))
  WITH CHECK (
    school_id IN (SELECT id FROM public.schools WHERE user_id = auth.uid())
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.school_classes c
        WHERE c.id = school_exams.class_id AND c.school_id = school_exams.school_id
      )
    )
  );

DROP POLICY IF EXISTS "Schools can update their students" ON public.students;
CREATE POLICY "Schools can update their students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.schools sc
      WHERE sc.id = students.school_id
        AND sc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.schools sc
      WHERE sc.id = students.school_id
        AND sc.user_id = auth.uid()
    )
    AND (
      students.class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.school_classes c
        WHERE c.id = students.class_id AND c.school_id = students.school_id
      )
    )
  );

-- Teacher class assignments are a uuid[] (no FK possible), so validate the
-- array contents with a trigger instead.
CREATE OR REPLACE FUNCTION public.validate_teacher_class_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bad_class_count integer;
BEGIN
  IF COALESCE(array_length(NEW.assigned_class_ids, 1), 0) > 0 THEN
    SELECT count(*) INTO v_bad_class_count
    FROM unnest(NEW.assigned_class_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.school_classes c
      WHERE c.id = cid AND c.school_id = NEW.school_id
    );
    IF v_bad_class_count > 0 THEN
      RAISE EXCEPTION 'Teachers can only be assigned classes belonging to their school';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_teacher_class_ownership ON public.school_teachers;
CREATE TRIGGER validate_teacher_class_ownership
  BEFORE INSERT OR UPDATE OF assigned_class_ids ON public.school_teachers
  FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_class_ownership();

-- 7. Converge the two school_classes definitions. 20260924120000 creates the
--    table WITHOUT class_year/updated_at; 20261002100000's CREATE TABLE IF NOT
--    EXISTS then no-ops on a fresh replay, leaving the live frontend inserting
--    columns that don't exist. Conditional ALTERs make both paths converge.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_classes' AND column_name = 'class_year'
  ) THEN
    ALTER TABLE public.school_classes ADD COLUMN class_year text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_classes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.school_classes ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Drop the superseded first-generation policies if a fresh replay created them.
DROP POLICY IF EXISTS "Schools can view their classes" ON public.school_classes;
DROP POLICY IF EXISTS "Schools can insert their classes" ON public.school_classes;
DROP POLICY IF EXISTS "Schools can update their classes" ON public.school_classes;
DROP POLICY IF EXISTS "Schools can delete their classes" ON public.school_classes;

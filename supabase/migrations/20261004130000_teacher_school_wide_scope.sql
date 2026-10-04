-- Teachers become school-wide scoped: access derives from belonging to the
-- school (school_teachers.user_id -> school_id), no longer from allocated
-- class arms. The assigned_class_ids column and its ownership trigger remain
-- in the database but stop being part of the access model.

-- 1. Students: any student of the teacher's school.
DROP POLICY IF EXISTS "Teachers can view their allocated classes' students" ON public.students;
CREATE POLICY "Teachers can view their school's students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.user_id = auth.uid()
        AND t.school_id = students.school_id
    )
  );

-- 2. Profiles: students of the teacher's school.
DROP POLICY IF EXISTS "Teachers can view their students' profiles" ON public.profiles;
CREATE POLICY "Teachers can view their students' profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t ON t.school_id = s.school_id
      WHERE t.user_id = auth.uid()
        AND s.user_id = profiles.id
    )
  );

-- 3. Quiz results: students of the teacher's school.
DROP POLICY IF EXISTS "Teachers can view their allocated classes' results" ON public.quiz_results;
CREATE POLICY "Teachers can view their school's students' results"
  ON public.quiz_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t ON t.school_id = s.school_id
      WHERE t.user_id = auth.uid()
        AND s.id = quiz_results.student_id
    )
  );

-- 4. Assignments: view for the teacher's school's students...
DROP POLICY IF EXISTS "Teachers can view their allocated classes' assignments" ON public.practice_assignments;
CREATE POLICY "Teachers can view their school's students' assignments"
  ON public.practice_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t ON t.school_id = s.school_id
      WHERE t.user_id = auth.uid()
        AND s.id = practice_assignments.student_id
    )
  );

-- 5. ...and create for them, attributed to an Active teacher of that school.
DROP POLICY IF EXISTS "Teachers can create assignments for their allocated classes" ON public.practice_assignments;
CREATE POLICY "Teachers can create assignments for their school's students"
  ON public.practice_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.id = practice_assignments.created_by_teacher_id
        AND t.user_id = auth.uid()
        AND t.status = 'Active'
        AND t.school_id = practice_assignments.school_id
        AND EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = practice_assignments.student_id
            AND s.school_id = t.school_id
        )
    )
  );

-- 6. Trigger: teacher branch now requires only that the attributing teacher is
--    an Active teacher of the student's school (class allocation no longer
--    participates in the access model).
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

  IF NEW.created_by_teacher_id IS NOT NULL THEN
    -- Teacher assignment: attributing teacher must be an Active teacher of
    -- the student's school.
    IF NOT EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.id = NEW.created_by_teacher_id
        AND t.status = 'Active'
        AND t.school_id = NEW.school_id
        AND t.school_id = v_student_school_id
    ) THEN
      RAISE EXCEPTION 'Assignment teacher must belong to the student''s school';
    END IF;
  ELSIF NEW.school_id IS NOT NULL THEN
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

  IF NEW.num_questions > 10 THEN
    IF NOT COALESCE(v_is_premium, false) OR NOT EXISTS (
      SELECT 1
      FROM public.subscriptions sub
      WHERE sub.student_id = NEW.student_id
        AND sub.status = 'active'
        AND sub.expires_at > now()
    ) THEN
      RAISE EXCEPTION 'Standard student accounts are limited to 10 questions per assignment';
    END IF;
  END IF;

  IF NEW.num_questions > 60 THEN
    RAISE EXCEPTION 'Assignments cannot exceed 60 questions';
  END IF;

  RETURN NEW;
END;
$$;

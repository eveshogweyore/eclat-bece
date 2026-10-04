-- Teacher scoping via Lead Teacher: a teacher's access derives from the
-- classes they lead (school_classes.lead_teacher = their registered
-- full_name), set at class creation. This replaces the class-arm allocation
-- model (assigned_class_ids) as the basis of teacher access.

-- 1. Classes: teachers see the classes they lead.
DROP POLICY IF EXISTS "Teachers can view their school's classes" ON public.school_classes;
CREATE POLICY "Teachers can view their led classes"
  ON public.school_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.user_id = auth.uid()
        AND t.school_id = school_classes.school_id
        AND t.full_name = school_classes.lead_teacher
    )
  );

-- 2. Students: students whose class is led by the teacher.
DROP POLICY IF EXISTS "Teachers can view their school's students" ON public.students;
CREATE POLICY "Teachers can view their led classes' students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    students.class_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.school_classes c
      JOIN public.school_teachers t
        ON t.school_id = c.school_id
       AND t.full_name = c.lead_teacher
      WHERE t.user_id = auth.uid()
        AND c.id = students.class_id
    )
  );

-- 3. Profiles: students of the teacher's led classes.
DROP POLICY IF EXISTS "Teachers can view their students' profiles" ON public.profiles;
CREATE POLICY "Teachers can view their led classes' students' profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_classes c ON c.id = s.class_id
      JOIN public.school_teachers t
        ON t.school_id = c.school_id
       AND t.full_name = c.lead_teacher
      WHERE t.user_id = auth.uid()
        AND s.user_id = profiles.id
    )
  );

-- 4. Quiz results: students of the teacher's led classes.
DROP POLICY IF EXISTS "Teachers can view their school's students' results" ON public.quiz_results;
CREATE POLICY "Teachers can view their led classes' results"
  ON public.quiz_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_classes c ON c.id = s.class_id
      JOIN public.school_teachers t
        ON t.school_id = c.school_id
       AND t.full_name = c.lead_teacher
      WHERE t.user_id = auth.uid()
        AND s.id = quiz_results.student_id
    )
  );

-- 5. Assignments: view for the teacher's led classes' students.
DROP POLICY IF EXISTS "Teachers can view their school's students' assignments" ON public.practice_assignments;
CREATE POLICY "Teachers can view their led classes' assignments"
  ON public.practice_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_classes c ON c.id = s.class_id
      JOIN public.school_teachers t
        ON t.school_id = c.school_id
       AND t.full_name = c.lead_teacher
      WHERE t.user_id = auth.uid()
        AND s.id = practice_assignments.student_id
    )
  );

-- 6. Create: for students in a class the inserting teacher leads, attributed
--    to themselves.
DROP POLICY IF EXISTS "Teachers can create assignments for their school's students" ON public.practice_assignments;
CREATE POLICY "Teachers can create assignments for their led classes"
  ON public.practice_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_classes c ON c.id = s.class_id
      JOIN public.school_teachers t
        ON t.school_id = c.school_id
       AND t.full_name = c.lead_teacher
      WHERE t.user_id = auth.uid()
        AND t.status = 'Active'
        AND t.id = practice_assignments.created_by_teacher_id
        AND s.id = practice_assignments.student_id
    )
  );

-- 7. Trigger: the attributing teacher must be an Active teacher whose led
--    class (lead_teacher match) contains the student. A student without a
--    class, or in another teacher's class, is rejected.
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
  v_student_class_id UUID;
BEGIN
  IF COALESCE(array_length(NEW.topics, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one topic is required';
  END IF;

  SELECT parent_id, is_premium, user_id, school_id, class_id
  INTO v_parent_id, v_is_premium, v_student_user_id, v_student_school_id, v_student_class_id
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
    -- Teacher assignment: the attributing teacher must be an Active teacher
    -- of the student's school whose led class contains the student.
    IF NOT EXISTS (
      SELECT 1
      FROM public.school_teachers t
      JOIN public.school_classes c
        ON c.school_id = t.school_id
       AND c.lead_teacher = t.full_name
      WHERE t.id = NEW.created_by_teacher_id
        AND t.status = 'Active'
        AND t.school_id = NEW.school_id
        AND t.school_id = v_student_school_id
        AND c.id = v_student_class_id
    ) THEN
      RAISE EXCEPTION 'Student must be in a class led by this teacher';
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

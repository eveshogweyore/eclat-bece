-- Teacher accounts + minimal teacher dashboard: a school-provisioned auth
-- identity linked to the school_teachers registry, class-scoped data access,
-- and teacher-attributed practice assignments.

-- 1. New role (guarded for idempotency, mirroring 20251203050650_add_admin_role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'teacher'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'teacher';
  END IF;
END $$;

-- 2. Link the registry to an auth identity. Nullable: registry rows can exist
--    without logins (the long-standing behaviour). Deleting the auth user
--    keeps the registry row and just clears the link.
ALTER TABLE public.school_teachers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_school_teachers_user_id ON public.school_teachers(user_id);

-- 3. Attribution for teacher-created practice assignments.
ALTER TABLE public.practice_assignments
  ADD COLUMN IF NOT EXISTS created_by_teacher_id uuid REFERENCES public.school_teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_practice_assignments_teacher
  ON public.practice_assignments(created_by_teacher_id);

-- 4. RLS: everything derives from the teacher's own registry row.
--    a) Teachers read their own registry record.
DROP POLICY IF EXISTS "Teachers can view own record" ON public.school_teachers;
CREATE POLICY "Teachers can view own record"
  ON public.school_teachers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

--    b) Teachers view their school's classes (needed for the assign dialog
--       and to resolve allocated class names).
DROP POLICY IF EXISTS "Teachers can view their school's classes" ON public.school_classes;
CREATE POLICY "Teachers can view their school's classes"
  ON public.school_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.user_id = auth.uid()
        AND t.school_id = school_classes.school_id
    )
  );

--    c) Teachers view students in their allocated class arms.
DROP POLICY IF EXISTS "Teachers can view their allocated classes' students" ON public.students;
CREATE POLICY "Teachers can view their allocated classes' students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    students.class_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.user_id = auth.uid()
        AND t.school_id = students.school_id
        AND t.assigned_class_ids @> ARRAY[students.class_id]
    )
  );

--    d) Teachers view those students' profiles (names/avatars).
DROP POLICY IF EXISTS "Teachers can view their students' profiles" ON public.profiles;
CREATE POLICY "Teachers can view their students' profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t
        ON t.school_id = s.school_id
       AND s.class_id IS NOT NULL
       AND t.assigned_class_ids @> ARRAY[s.class_id]
      WHERE t.user_id = auth.uid()
        AND s.user_id = profiles.id
    )
  );

--    e) Teachers view those students' quiz results (results view).
DROP POLICY IF EXISTS "Teachers can view their allocated classes' results" ON public.quiz_results;
CREATE POLICY "Teachers can view their allocated classes' results"
  ON public.quiz_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t
        ON t.school_id = s.school_id
       AND s.class_id IS NOT NULL
       AND t.assigned_class_ids @> ARRAY[s.class_id]
      WHERE t.user_id = auth.uid()
        AND s.id = quiz_results.student_id
    )
  );

--    f) Teachers view assignments for their allocated classes' students...
DROP POLICY IF EXISTS "Teachers can view their allocated classes' assignments" ON public.practice_assignments;
CREATE POLICY "Teachers can view their allocated classes' assignments"
  ON public.practice_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.school_teachers t
        ON t.school_id = s.school_id
       AND s.class_id IS NOT NULL
       AND t.assigned_class_ids @> ARRAY[s.class_id]
      WHERE t.user_id = auth.uid()
        AND s.id = practice_assignments.student_id
    )
  );

--    g) ...and create assignments for them, attributed to themselves. The
--       teacher must be active, the school must match, and the student's
--       class must be one of the teacher's allocated classes.
DROP POLICY IF EXISTS "Teachers can create assignments for their allocated classes" ON public.practice_assignments;
CREATE POLICY "Teachers can create assignments for their allocated classes"
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
            AND s.class_id IS NOT NULL
            AND t.assigned_class_ids @> ARRAY[s.class_id]
        )
    )
  );

-- 5. Trigger: teacher branch for data integrity (mirrors the school/parent
--    branches; premium cap and topic rules apply to teacher-created tasks too).
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
    -- Teacher assignment: an Active teacher of the student's school whose
    -- allocated classes cover the student's class.
    IF NOT EXISTS (
      SELECT 1 FROM public.school_teachers t
      WHERE t.id = NEW.created_by_teacher_id
        AND t.status = 'Active'
        AND t.school_id = NEW.school_id
        AND t.school_id = v_student_school_id
        AND v_student_class_id IS NOT NULL
        AND t.assigned_class_ids @> ARRAY[v_student_class_id]
    ) THEN
      RAISE EXCEPTION 'Assignment teacher must be allocated to the student''s class';
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
